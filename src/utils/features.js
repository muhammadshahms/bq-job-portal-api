import nodemailer from 'nodemailer'
import twilio from 'twilio';

const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.NODEMAILOR_EMAIL,
            pass: process.env.NODEMAILOR_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.NODEMAILOR_EMAIL,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
    };

    await transporter.sendMail(mailOptions);
};

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const sendOTPSMS = async (phoneNumber, otp) => {
    try {
        const message = await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });
        return true;
    } catch (error) {
        console.error('Failed to send OTP via SMS:', error.message);
        throw new Error('Failed to send OTP via SMS');
    }
};


export { sendOTPEmail, sendOTPSMS }