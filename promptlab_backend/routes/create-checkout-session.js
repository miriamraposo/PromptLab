import stripe from '../../utils/stripe.js'; // Ajusta la ruta según dónde estés

export default async function createCheckoutSession(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { planId, email } = req.body;

    if (!planId) {
        return res.status(400).json({ error: 'Falta el planId' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
    }

    const successUrl =
        process.env.STRIPE_SUCCESS_URL ||
        'http://localhost:5173/dashboard?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl =
        process.env.STRIPE_CANCEL_URL || 'http://localhost:5173/precios';

    try {
      

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: planId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: email || undefined,
            metadata: {
                user_id: req.body.userId || '',  // PASAR userId para relacionar suscripción
                plan_id: planId
            }
        });

        return res.status(200).json({ sessionId: session.id });
    } catch (err) {
        console.error('[Stripe] Error creando la sesión:', err);
        return res.status(500).json({ error: 'Error al crear la sesión de pago' });
    }
}
