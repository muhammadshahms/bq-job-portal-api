const getBase64 = (file) =>
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};


// helpers/validatePassword.js

// helpers/validatePassword.js

const validatePassword = (password) => {
    const conditions = []; // Initialize as an empty array

    if (!/[A-Z]/.test(password)) {
        conditions.push("one capital letter");
    }
    else if (!/[a-z]/.test(password)) {
        conditions.push("one small letter");
    }
    else if (!/[0-9]/.test(password)) {
        conditions.push("one number");
    }
    else if (!/[^A-Za-z0-9]/.test(password)) {
        conditions.push("one special character");
    }

    let errorMessage = "";

    if (conditions.length > 0) {
        errorMessage = `Password must contain at least ${conditions.join(", ")}.`;
    }

    else if (password.length < 8) {
        errorMessage += " Password must be at least 8 characters long.";
    }

    return {
        isValid: !errorMessage,
        errorMessage,
    };
};




export { getBase64, generateOTP, validatePassword }