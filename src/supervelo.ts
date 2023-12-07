import {swapBot} from "./index"

new swapBot({
    token: "6953613952:AAHYahqX4meiXJQRirECYaIoRK-MhjXdhTQ",
    adminName: "gadillac",
    chainIds: [1],
    dbData: {
        host: "127.0.0.1",
        user: "root",
        password: "root123456",
        port: 3306,
        database: "dandao"
    }
})