const bcrypt = require('bcrypt');

const password = "Bhim@1234";

(async () => {
    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        console.log("Password:", password);
        console.log("Hash:", hash);
    } catch (err) {
        console.error(err);
    }
})();