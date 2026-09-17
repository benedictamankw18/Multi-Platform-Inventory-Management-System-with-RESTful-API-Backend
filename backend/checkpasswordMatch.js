const bcrypt = require('bcrypt');

const password = "Bhim@1234";
const hash = "$2b$10$E0OmSHyQDWhjXRtUQpTGPuYbND2YmQkMJaWkD3oV1N566sz4FsGIS"; // Replace with your stored hash

const isMatch = bcrypt.compareSync(password, hash);

console.log(isMatch); // true or false