const getBase64 = (file) =>
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export { getBase64, generateOTP }