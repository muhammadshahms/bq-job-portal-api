import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})

const upload = multer({ storage })

const singleAvatar = upload.single('avatar');
const singleResume = upload.single('resume');

export { upload, singleAvatar, singleResume }