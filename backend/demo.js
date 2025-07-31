const bcrypt = require("bcryptjs");

let hashedPwd;
async function getHashedPwd(pwd) {
    const salt = await bcrypt.genSalt(10);
    console.log("salt", salt);
    hashedPwd = await bcrypt.hash(pwd, salt);
    console.log("Original pwd:", pwd);
    console.log("Hashed pwd:", hashedPwd);
}
async function comparePwd(pwd) {
    const result = await bcrypt.compare(pwd, hashedPwd);
    console.log("Result: ", result);

}
async function run() {
    const pwd = "Dhiraj";
    await getHashedPwd(pwd);
    await comparePwd(pwd);
}
run();