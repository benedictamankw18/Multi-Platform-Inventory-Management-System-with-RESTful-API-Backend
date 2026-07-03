const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({

    destination(req, file, cb) {
        cb(null, uploadPath);
    },

    filename(req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );

    }

});

const fileFilter = (req, file, cb) => {

    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (allowed.includes(file.mimetype)) {
        return cb(null, true);
    }

    cb(
        new Error("Only JPG, PNG and WEBP images are allowed."),
        false
    );

};

module.exports = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024
    }

});