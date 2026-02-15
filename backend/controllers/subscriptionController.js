const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');

const createCheckoutSession = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Подписка на платформу кибербезопасности',
              description: 'Доступ ко всем задачам и трекам обучения'
            },
            unit_amount: 1500,
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      client_reference_id: req.user.id.toString(),
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id.toString()
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Ошибка создания сессии оплаты:', error);
    res.status(500).json({ error: 'Ошибка создания сессии оплаты' });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook ошибка:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Необработанное событие: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).json({ error: 'Ошибка обработки webhook' });
  }
};

async function handleCheckoutSessionCompleted(session) {
  const userId = parseInt(session.metadata.userId);

  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  await db.query(
    `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))`,
    [
      userId,
      subscription.id,
      subscription.customer,
      'active',
      subscription.current_period_start,
      subscription.current_period_end
    ]
  );

  await db.query(
    `UPDATE users SET 
      subscription_active = true,
      subscription_expires_at = to_timestamp($1)
     WHERE id = $2`,
    [subscription.current_period_end, userId]
  );

  await db.query(
    'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
    [userId, 'subscription_activated', JSON.stringify({ subscription_id: subscription.id })]
  );
}

async function handleSubscriptionUpdated(subscription) {
  const subResult = await db.query(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscription.id]
  );

  if (subResult.rows.length === 0) return;

  const userId = subResult.rows[0].user_id;

  await db.query(
    `UPDATE subscriptions SET 
      status = $1,
      current_period_start = to_timestamp($2),
      current_period_end = to_timestamp($3),
      updated_at = CURRENT_TIMESTAMP
     WHERE stripe_subscription_id = $4`,
    [subscription.status, subscription.current_period_start, subscription.current_period_end, subscription.id]
  );

  const isActive = subscription.status === 'active';

  await db.query(
    `UPDATE users SET 
      subscription_active = $1,
      subscription_expires_at = to_timestamp($2)
     WHERE id = $3`,
    [isActive, subscription.current_period_end, userId]
  );
}

async function handleSubscriptionDeleted(subscription) {
  const subResult = await db.query(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscription.id]
  );

  if (subResult.rows.length === 0) return;

  const userId = subResult.rows[0].user_id;

  await db.query(
    `UPDATE subscriptions SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
     WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );

  await db.query(
    'UPDATE users SET subscription_active = false WHERE id = $1',
    [userId]
  );

  await db.query(
    'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
    [userId, 'subscription_canceled', JSON.stringify({ subscription_id: subscription.id })]
  );
}

async function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  
  const subResult = await db.query(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscription.id]
  );

  if (subResult.rows.length === 0) return;

  const userId = subResult.rows[0].user_id;

  await db.query(
    `UPDATE users SET 
      subscription_active = true,
      subscription_expires_at = to_timestamp($1)
     WHERE id = $2`,
    [subscription.current_period_end, userId]
  );
}

async function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  const subResult = await db.query(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
    [invoice.subscription]
  );

  if (subResult.rows.length === 0) return;

  const userId = subResult.rows[0].user_id;

  await db.query(
    'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
    [userId, 'payment_failed', JSON.stringify({ invoice_id: invoice.id })]
  );
}

const cancelSubscription = async (req, res) => {
  try {
    const subResult = await db.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Активная подписка не найдена' });
    }

    const stripeSubscriptionId = subResult.rows[0].stripe_subscription_id;

    await stripe.subscriptions.cancel(stripeSubscriptionId);

    res.json({ message: 'Подписка отменена' });
  } catch (error) {
    console.error('Ошибка отмены подписки:', error);
    res.status(500).json({ error: 'Ошибка отмены подписки' });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ subscription: null });
    }

    res.json({ subscription: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения статуса подписки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription,
  getSubscriptionStatus
};
