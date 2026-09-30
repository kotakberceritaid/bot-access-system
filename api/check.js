export default async function handler(req, res) {
    // Hanya menerima POST
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method Not Allowed"
        });
    }

    // Cek API Key milik SC
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.BOT_API_KEY) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    // Ambil nomor dari body
    const { number } = req.body || {};

    if (!number) {
        return res.status(400).json({
            success: false,
            message: "Number is required"
        });
    }

    // Normalisasi nomor
    const botNumber = String(number)
        .replace(/\D/g, "");

    if (!botNumber) {
        return res.status(400).json({
            success: false,
            message: "Invalid number"
        });
    }

    try {
        const url =
            `${process.env.SUPABASE_URL}/rest/v1/bot_access` +
            `?select=number,active` +
            `&number=eq.${encodeURIComponent(botNumber)}` +
            `&active=eq.true`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization":
                    `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });

        if (!response.ok) {
            console.error(
                "Supabase error:",
                response.status
            );

            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        const data = await response.json();

        const registered = data.length > 0;

        return res.status(200).json({
            success: true,
            registered
        });

    } catch (error) {

        console.error("API error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
    }
