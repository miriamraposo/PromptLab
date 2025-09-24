// src/pages/api/stripe-webhook.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ clave confidencial
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
    api: {
        bodyParser: false, // 👈 importante para firmar el webhook
    },
};

export default async function webhookHandler(req, res) {
    if (req.method !== 'POST') {
        return res.setHeader('Allow', 'POST').status(405).end('Method Not Allowed');
    }

    const buffers = [];
    for await (const chunk of req) {
        buffers.push(chunk);
    }

    const rawBody = Buffer.concat(buffers).toString('utf8');
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('⚠️ Error verificando webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const stripeSubId = session.subscription;

        if (!userId || !planId || !stripeSubId) {
            console.error('❌ Faltan datos: userId, planId o subscription ID.');
            return res.status(400).send('Metadata o subscription incompleta.');
        }

        let currentPeriodEnd = null;
        try {
            const subscription = await stripe.subscriptions.retrieve(stripeSubId);
            currentPeriodEnd = subscription.current_period_end;
        } catch (err) {
            console.error('❌ Error recuperando la suscripción de Stripe:', err.message);
            return res.status(500).send('Error al obtener datos de suscripción.');
        }

        try {
            const { error } = await supabase
                .from('subscriptions')
                .upsert(
                    {
                        id: stripeSubId, // ID real de Stripe
                        user_id: userId, // UUID en Supabase
                        plan_id: planId,
                        status: 'active',
                        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
                        metadata: session,
                    },
                    { onConflict: 'id' }
                );

            if (error) {
                throw error;
            }

            
        } catch (err) {
            console.error('❌ Error actualizando suscripción en Supabase:', err.message);
            return res.status(500).send('Error interno al guardar suscripción.');
        }
    }

    // ✅ Responder a Stripe que se recibió el evento correctamente
    res.status(200).json({ received: true });
}
