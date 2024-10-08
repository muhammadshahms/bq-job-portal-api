const getBase64 = (file) =>
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};



const validatePassword = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})/;
    
    let errorMessage = '';

    if (!regex.test(password)) {
        const conditions = [];
        
        if (!/[A-Z]/.test(password)) {
            conditions.push("one capital letter");
        }
        if (!/[a-z]/.test(password)) {
            conditions.push("one small letter");
        }
        if (!/[0-9]/.test(password)) {
            conditions.push("one number");
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            conditions.push("one special character");
        }
        if (password.length < 8) {
            conditions.push("at least 8 characters long");
        }

        errorMessage = `Password must contain at least ${conditions.join(", ")}.`;
    }


    return {
        isValid: !errorMessage,
        errorMessage,
    };
};




export { getBase64, generateOTP, validatePassword }