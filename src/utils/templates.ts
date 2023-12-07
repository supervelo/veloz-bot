import BigNumber from "bignumber.js"
import { Config } from "../config/constrants"
import { getBalance, batchCheckERC20Balance } from "./fetch"
import Web3 from "web3"
import { insertItem } from "../types"
import dayjs from "dayjs"
export const formatUSDPrice = (price: number) => {
    if (price >= 0 && price < 1000) {
        return BigNumber(price).toFixed()
    } else if (price >= 1000 && price < 1000000) {
        return BigNumber(Number((price / 1000).toFixed(3))).toFixed() + 'K'
    } else if (price >= 1000000 && price < 1000000000) {
        return BigNumber(Number((price / 1000000).toFixed(3))).toFixed() + 'M'
    } else if (price >= 1000000000) {
        return BigNumber(Number((price / 1000000000).toFixed(3))).toFixed() + 'B'
    }
}
export const getTypeName = (type: number) => {
    switch (type) {
        case 1:
            return "Manual Buy"
        case 2:
            return "Manual Sell"
        case 3:
            return "Copy Buy"
        case 4:
            return "Copy Sell"
        case 5:
            return "Sniping"
        case 6:
            return "MEV"
        case 7:
            return "Auto-Sell"
    }
}
export const dexNames = {
    1: {
        "uniswapv3": "uniswap V3",
        "uniswapv2": "uniswap V2"
    },
    5: {
        "uniswapv3": "uniswap V3",
        "uniswapv2": "uniswap V2"
    },
    42161: {
        "uniswapv3": "uniswap V3",
        "uniswapv2": "sushiswap",
        "camelotv2": "camelotswap"
    }
}
export const defaultKeyboard = [
    {
        text: '↪️ Return to homepage',
        callback_data: "go_home"
    }
]
export const chainEnum = {
    1: "Ethereum",
    42161: "Arbitrum",
    5: "Goerli"
}
export const getScan = (address: string, chainId: number) => {
    switch (chainId) {
        case 1:
            return `https://etherscan.io/token/${address}`
        case 42161:
            return `https://arbiscan.io/token/${address}`
        case 5:
            return `https://goerli.etherscan.io/token/${address}`
    }
}
export const getTxScan = (hash: string, chainId: number) => {
    switch (chainId) {
        case 1:
            return `https://etherscan.io/tx/${hash}`
        case 42161:
            return `https://arbiscan.io/tx/${hash}`
        case 5:
            return `https://goerli.etherscan.io/tx/${hash}`
    }
}
export const getDexTool = (address: string, chainId: number) => {
    switch (chainId) {
        case 1:
            return `https://dexscreener.com/ethereum/${address}`
        case 42161:
            return `https://dexscreener.com/arbitrum/${address}`
        case 5:
            return `https://dexscreener.com/ethereum/${address}`
    }
}
export const editorBuySuccessTemplate = async (bot: any, contract: any, user: any, currentGasPrice: number, wethPrice: number, log: any) => {
    let tx = getTxScan(log.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    let receiveAddress = user.default_address
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, log.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Total gain: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let perPrice = BigNumber(Number((Number(log.price) * wethPrice).toFixed(15))).toFixed()
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No pool yet'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Buy：${log.in_amount} ETH</b>\n` +
        `<b>💵 Outcome：${log.out_amount} ${log.symbol}</b>\n` +
        `<b>🚨 Type：${getTypeName(log.type)}</b>\n` +
        `<b>⏳ Status: Success</b>\n` +
        `<b>💰 Total costs：$ ${log.cost}</b>\n` +
        `<b>🔎 Transaction Details：<a href='${tx}'>Click to view</a></b>\n\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Offer price: $ ${perPrice}</b>\n` +
        `<b>💵 Entry price: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Deposit Address:</b>\n` +
        `<b>${log.address}</b>\n` +
        `<b>🎉 Wallet${contract.symbol}: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Volume: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 2 ${log.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 2 ${log.id}`
            },
        ],
        [
            {
                text: `💯 Selling ratio(${user.sell_percent} %)`,
                callback_data: `/set_sell_percent 2 ${log.id} `
            }
        ],
        [
            {
                text: `🚀 Sell`,
                callback_data: `/sell ${contract.chain_id} ${contract.address} 2 ${log.id}`
            },
        ],
    ]
    bot.editMessageText(str, {
        chat_id: user.query.message.chat.id,
        message_id: user.query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": buyKeyboard
        }
    })
}
export const editorSellSuccessTemplate = async (bot: any, contract: any, user: any, currentGasPrice: number, wethPrice: number, log: any) => {
    let tx = getTxScan(log.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    let receiveAddress = user.default_address
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, log.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Fee: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Fee: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let perPrice = BigNumber(Number((Number(log.price) * wethPrice).toFixed(15))).toFixed()
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Sold：${log.in_amount} ${log.symbol}</b>\n` +
        `<b>💵 Received：${log.out_amount} ETH</b>\n` +
        `<b>🚨 Type：${getTypeName(log.type)}</b>\n` +
        `<b>⏳ Status: Success</b>\n` +
        `<b>💰 Total Income：$ ${log.cost}</b>\n` +
        `<b>🔎 Transaction Details：<a href='${tx}'>Click here</a></b>\n\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price Before Sell: $ ${perPrice}</b>\n` +
        `<b>💵 Price After Sell: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Share: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Sell Address:</b>\n` +
        `<b>${log.address}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Value: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 3 ${log.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 3 ${log.id}`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 3 ${log.id}`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 ${log.id}`
            },
        ],
    ]
    bot.editMessageText(str, {
        chat_id: user.query.message.chat.id,
        message_id: user.query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": buyKeyboard
        }
    })
}
export const sellSuccessTemplate = async (bot: any, msg: any, contract: any, user: any, currentGasPrice: number, wethPrice: number, log: any) => {
    let tx = getTxScan(log.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    let receiveAddress = user.default_address
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, log.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let perPrice = BigNumber(Number((Number(log.price) * wethPrice).toFixed(15))).toFixed()
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Sold：${log.in_amount} ${log.symbol}</b>\n` +
        `<b>💵 Received：${log.out_amount} ETH</b>\n` +
        `<b>🚨 Type：${getTypeName(log.type)}</b>\n` +
        `<b>⏳ Status：Success</b>\n` +
        `<b>💰 Total Income：$ ${log.cost}</b>\n` +
        `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price Before Sell: $ ${perPrice}</b>\n` +
        `<b>💵 Price After Sell: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Sell Address:</b>\n` +
        `<b>${log.address}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Value: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 3 ${log.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 3 ${log.id}`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 3 ${log.id}`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 ${log.id}`
            },
        ],
    ]
    bot.sendMessage(msg.message.chat.id, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": buyKeyboard
        }
    }
    )
}
export const buySuccessTemplate = async (bot: any, msg: any, contract: any, user: any, currentGasPrice: number, wethPrice: number, log: any) => {
    let tx = getTxScan(log.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    let receiveAddress = user.default_address
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, log.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let perPrice = BigNumber(Number((Number(log.price) * wethPrice).toFixed(15))).toFixed()
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Buy：${log.in_amount} ETH</b>\n` +
        `<b>💵 Received：${log.out_amount} ${log.symbol}</b>\n` +
        `<b>🚨 Type：${getTypeName(log.type)}</b>\n` +
        `<b>⏳ Status：Success</b>\n` +
        `<b>💰 Total Cost：$ ${log.cost}</b>\n` +
        `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n\n` +
        `<b>⛽ Gas Price: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Pre-Buy Price: $ ${perPrice}</b>\n` +
        `<b>💵 Post-Buy Price: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Buy Address:</b>\n` +
        `<b>${log.address}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Value: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 2 ${log.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 2 ${log.id}`
            },
        ],
        [
            {
                text: `💯 Sell Ratio(${user.sell_percent} %)`,
                callback_data: `/set_sell_percent 2 ${log.id}`
            }
        ],
        [
            {
                text: `🚀 Sell`,
                callback_data: `/sell ${contract.chain_id} ${contract.address} 2 ${log.id}`
            },
        ],
    ]
    bot.sendMessage(msg.message.chat.id, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": buyKeyboard
        }
    }
    )
}
export const pendingTamplate = async (bot: any, msg: any, contract: any, amount: number, hash: string, type: number) => {
    let tx = getTxScan(hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let amountIn = null
    if (type == 1) {
        amountIn = `<b>💵 Buy：${BigNumber(amount).toFixed()} ETH</b>\n`
    } else if (type == 2) {
        amountIn = `<b>💵 Sell：${BigNumber(amount).toFixed()} ${contract.symbol}</b>\n`
    } else if (type == 3) {
        amountIn = `<b>💵 Copy-Trading Buy：${BigNumber(amount).toFixed()} ETH</b>\n`
    } else if (type == 4) {
        amountIn = `<b>💵 Copy-Trading Sell：${BigNumber(amount).toFixed()} ${contract.symbol}</b>\n`
    } else if (type == 5) {
        amountIn = `<b>💵 Sniping：${BigNumber(amount).toFixed()} ${contract.symbol}</b>\n`
    }
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        amountIn +
        `<b>🚨 Type：${getTypeName(type)}</b>\n` +
        `<b>⏳ Status：pending</b>\n` +
        `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n`

    bot.sendMessage(msg.message.chat.id, str, {
        "parse_mode": "HTML"
    }
    )
}
export const errorTamplate = async (bot: any, msg: any, contract: any, amount: number, hash: string, type: number, remark: string) => {
    let a = ""
    if (hash) {
        let tx = getTxScan(hash, contract.chain_id)
        a = `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n`
    }
    let scan = getScan(contract.address, contract.chain_id)
    let amountIn = null
    if (type == 1) {
        amountIn = `<b>💵 Buy：${BigNumber(amount).toFixed()} ETH</b>\n`
    } else if (type == 2) {
        amountIn = `<b>💵 Sell：${BigNumber(amount).toFixed()} ${contract.symbol}</b>\n`
    } else if (type == 3) {
        amountIn = `<b>💵 Copy-Trading Buy：${BigNumber(amount).toFixed()} ETH</b>\n`
    } else if (type == 4) {
        amountIn = `<b>💵 Copy-Trading Sell：${BigNumber(amount).toFixed()} ${contract.symbol}</b>\n`
    }
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        amountIn +
        `<b>🚨 Type：${getTypeName(type)}</b>\n` +
        `<b>⏳ Status：Fail</b>\n` +
        `<b>📄 Reason：${remark}</b>\n` +
        a

    bot.sendMessage(msg.message.chat.id, str, {
        "parse_mode": "HTML"
    }
    )
}
export const editorContractTemplate = async (bot: any, contract: any, user: any, currentGasPrice: string, wethPrice: number) => {
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    if (user.default_address) {
        let receiveAddress = user.default_address
        let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
        let ethBalance = await getBalance(contract.chain_id, user.default_address)
        if (coinBalance.length) {
            userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
        }
        userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    }
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let dex = getDexTool(contract.address, contract.chain_id)
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>⛽ Gas Price: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Default address:</b>\n` +
        `<b>${user.default_address ? user.default_address : 'No address set yet'}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Value: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const contractKeyboard = [
        [
            {
                text: `💳 (${user.default_address ? user.default_address.substring(user.default_address.length - 15, user.default_address.length) : 'Select wallet'})`,
                callback_data: "picker_wallet"
            },
        ],
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 1 0`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 1 0`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 1 0`
            }
        ],
        [
            {
                text: `💯 Sell Ratio(${user.sell_percent} %)`,
                callback_data: `/set_sell_percent 1 0`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 0`
            },
            {
                text: `🚀 Sell`,
                callback_data: `/sell ${contract.chain_id} ${contract.address} 2 0`
            },
        ],
    ]
    bot.editMessageText(str, {
        chat_id: user.query.message.chat.id,
        message_id: user.query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": contractKeyboard
        }
    })
}
export const pickerFollowWalletTempalte = async (bot: any, msg: any, db: any, watchId: number) => {
    let wallets = await db.select("wallet", [`telegram_id=${msg.from.id}`])
    let str = ``
    if (wallets.length) {
        str += `<b>Please select a wallet</b>`
    } else {
        str = "<b>You need to bind your wallet first.</b>"
    }
    let find = await db.find("watch", [`id=${watchId}`, `telegram_id=${msg.from.id}`])
    if (find) {
        let keyboard = []
        wallets.forEach((item, index) => {
            let showAddr = item.address.substring(0, 15) + '···' + item.address.substring(item.address.length - 15, item.address.length)
            keyboard.push([
                {
                    text: showAddr,
                    callback_data: `/set_follow_wallet ${index} ${watchId}`
                }
            ])
        })
        if (!wallets.length) {
            keyboard.push([{
                text: '💳 Add wallet',
                callback_data: "go_home"
            }])
        }
        keyboard.push([{
            text: '↪️ Return',
            callback_data: `/handle_watch ${find.address}`
        }])
        bot.editMessageText(str, {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            parse_mode: "HTML",
            reply_markup: {
                "inline_keyboard": keyboard
            }
        })
    }
}
export const pickerTaskWalletTempalte = async (bot: any, msg: any, task: any, db: any) => {
    let wallets = await db.select("wallet", [`telegram_id=${msg.from.id}`])
    let str = ``
    if (wallets.length) {
        str += `<b>Please select a wallet</b>`
    } else {
        str = "<b>You need to bind your wallet first.</b>"
    }
    let keyboard = []
    wallets.forEach((item, index) => {
        let showAddr = item.address.substring(0, 15) + '···' + item.address.substring(item.address.length - 15, item.address.length)
        keyboard.push([
            {
                text: showAddr,
                callback_data: `/set_task_wallet ${index} ${task.id}`
            }
        ])
    })
    if (!wallets.length) {
        keyboard.push([{
            text: '💳 Add wallet',
            callback_data: "go_home"
        }])
    }
    bot.editMessageText(str, {
        chat_id: msg.message.chat.id,
        message_id: msg.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": keyboard
        }
    })
}
export const pickerWalletTempalte = async (bot: any, msg: any, db: any) => {
    let wallets = await db.select("wallet", [`telegram_id=${msg.from.id}`])
    let str = ``
    if (wallets.length) {
        str += `<b>Please select a wallet</b>`
    } else {
        str = "<b>You need to bind your wallet first.</b>"
    }
    let keyboard = []
    let contractAddress = msg.message.text.split("\n")[3]
    wallets.forEach((item, index) => {
        let showAddr = item.address.substring(0, 15) + '···' + item.address.substring(item.address.length - 15, item.address.length)
        keyboard.push([
            {
                text: showAddr,
                callback_data: `/set_default_wallet ${index} ${contractAddress}`
            }
        ])
    })
    if (!wallets.length) {
        keyboard.push([{
            text: '💳 Add wallet',
            callback_data: "go_home"
        }])
    }
    bot.editMessageText(str, {
        chat_id: msg.message.chat.id,
        message_id: msg.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": keyboard
        }
    })
}
export const createContractTemplate = async (bot: any, currentGasPrice: number, wethPrice: number, chatId: number, contract: insertItem) => {
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let pools = JSON.parse(contract.liquidity_pools)
    let scan = getScan(contract.address, contract.chain_id)
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let price = BigNumber((Number(pools[0][contract.symbol]) * wethPrice).toFixed(15)).toFixed()
    let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
    pools.forEach(item => {
        poolEthBalance += item.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(item.pool.reserve0) : Number(item.pool.reserve1)
        poolTokenBalance += item.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(item.pool.reserve1) : Number(item.pool.reserve0)
    })
    poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
    let percent = 0
    if (Number(firstPrice) > Number(price)) {
        percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
    } else {
        percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
    }
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${pools[0].pool.pool}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][pools[0].version]}</b>\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        `<b>💵 Initial Price: $ ${firstPrice}</b>\n` +
        `<b>📈 Change: ${percent} %</b>\n` +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n`
    const contractKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/send_contract ${contract.address}`
            },
        ],
    ]
    bot.sendMessage(chatId, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": contractKeyboard
        }
    }
    )
}
export const editorRushDetailTemplate = async (bot: any, query: any, contract: any, task: any, currentGasPrice: string, wethPrice: number) => {
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    if (task.private_key) {
        let receiveAddress = task.address
        let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
        let ethBalance = await getBalance(contract.chain_id, receiveAddress)
        if (coinBalance.length) {
            userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
        }
        userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Default address:</b>\n` +
        `<b>${task.address ? task.address : 'No address set yet'}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Value: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    let startTime = dayjs(task.start_time * 1000).format("YYYY-MM-DD HH:mm:ss")
    const contractKeyboard = [
        [
            {
                text: `💳 (${task.address ? task.address.substring(task.address.length - 15, task.address.length) : 'Select wallet'})`,
                callback_data: `/picker_task_wallet ${task.id}`
            },
        ],
        [
            {
                text: `⛽ (${task.gas_fee} Gwei)`,
                callback_data: `/set_task_gas_fee  ${task.id}`
            },
            {
                text: `💰 Buy amount(${task.amount} ETH)`,
                callback_data: `/set_task_buy_amount  ${task.id}`
            }
        ],
        [
            {
                text: `⏰ Time(${startTime})`,
                callback_data: `/set_task_start_time  ${task.id}`
            }
        ],
        [
            {
                text: '❌ Delete task',
                callback_data: `/delete_task ${task.id}`
            }
        ],
        defaultKeyboard
    ]
    bot.editMessageText(str, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": contractKeyboard
        }
    })
}
export const rushDetailTemplate = async (bot: any, chatId: number, contract: any, task: any, currentGasPrice: string, wethPrice: number) => {
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    if (task.private_key) {
        let receiveAddress = task.address
        let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
        let ethBalance = await getBalance(contract.chain_id, receiveAddress)
        if (coinBalance.length) {
            userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
        }
        userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Default address:</b>\n` +
        `<b>${task.address ? task.address : 'No address set yet'}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Value: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    let startTime = dayjs(task.start_time * 1000).format("YYYY-MM-DD HH:mm:ss")
    const contractKeyboard = [
        [
            {
                text: `💳 (${task.address ? task.address.substring(task.address.length - 15, task.address.length) : 'Select wallet'})`,
                callback_data: `/picker_task_wallet ${task.id}`
            },
        ],
        [
            {
                text: `⛽ (${task.gas_fee} Gwei)`,
                callback_data: `/set_task_gas_fee ${task.id}`
            },
            {
                text: `💰 Buy amount(${task.amount} ETH)`,
                callback_data: `/set_task_buy_amount ${task.id}`
            }
        ],
        [
            {
                text: `⏰ Time(${startTime})`,
                callback_data: `/set_task_start_time ${task.id}`
            }
        ],
        [
            {
                text: '❌ Delete task',
                callback_data: `/delete_task ${task.id}`
            }
        ],
        defaultKeyboard
    ]
    bot.sendMessage(chatId, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": contractKeyboard
        }
    }
    )
}
export const contractTemplate = async (bot: any, msg: any, contract: any, user: any, currentGasPrice: string, wethPrice: number) => {
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let exchangeValue = 0
    if (user.default_address) {
        let receiveAddress = user.default_address
        let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: receiveAddress }], contract.chain_id)
        let ethBalance = await getBalance(contract.chain_id, user.default_address)
        if (coinBalance.length) {
            userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
        }
        userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
        exchangeValue = Number((Number(contract.fastGetContractPrice.price) * userCoinBalance).toFixed(5))
    }
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Default address:</b>\n` +
        `<b>${user.default_address ? user.default_address : 'No address set yet'}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>💰 Value: ${exchangeValue} ETH</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const contractKeyboard = [
        [
            {
                text: `💳 (${user.default_address ? user.default_address.substring(user.default_address.length - 15, user.default_address.length) : 'Select wallet'})`,
                callback_data: "picker_wallet"
            },
        ],
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 1 0`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 1 0`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 1 0`
            }
        ],
        [
            {
                text: `💯 Sell Ratio(${user.sell_percent} %)`,
                callback_data: `/set_sell_percent 1 0`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 0`
            },
            {
                text: `🚀 Sell`,
                callback_data: `/sell ${contract.chain_id} ${contract.address} 2 0`
            },
        ],
    ]
    bot.sendMessage(msg.from.id, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": contractKeyboard
        }
    }
    )
}
export const homeTemplate = (bot: any, msg: any) => {
    return new Promise<number>(async (resolve) => {
        bot.sendMessage(msg.chat.id, `<b>📈📈📈📈📈📈📈📈📈📈📈📈</b>\n\n<b>Welcome to Supervelo Bot</b>\n\n<b>This bot does not constitute investment advice, please bear your own risks</b>\n\n<b>📈📈📈📈📈📈📈📈📈📈📈📈</b>\n`
            , {
                "parse_mode": "HTML",
                "reply_markup": {
                    "inline_keyboard": homeKeyboard
                }
            }
        ).then(res => {
            resolve(res.message_id)
        })
    })
}
export const goBackHomeTemplate = (bot: any, msg: any) => {
    let str = `<b>📈📈📈📈📈📈📈📈📈📈📈📈</b>\n\n<b>Welcome to Supervelo Bot</b>\n\n<b>This bot does not constitute investment advice, please bear your own risks</b>\n\n<b>📈📈📈📈📈📈📈📈📈📈📈📈</b>\n`
    bot.editMessageText(str, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
        reply_markup: {
            "inline_keyboard": homeKeyboard
        }
    })
}
export const networkTemplate = (bot: any, msg: any, chainIds: number[]) => {
    let netWorkKeyboard = []
    chainIds.forEach(item => {
        netWorkKeyboard.push({
            text: chainEnum[item],
            callback_data: chainEnum[item],
        })
    })
    bot.editMessageText(`🌏<b>Please select the origin chain</b>\n\n<b>It is not applicable to all custom nodes. If you have self-built nodes, you can use them</b>`, {
        chat_id: msg.message.chat.id,
        message_id: msg.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": [netWorkKeyboard, [...defaultKeyboard]]
        }
    })
}
export const addWalletTemplate = (bot: any, msg: any) => {
    let str = "❗️❗️❗️ <b>Please look for Tugou BOT and do not send it to the scammer bot by mistake</b>\n\n<b>Please enter and select the binding wallet method</b>"
    bot.editMessageText(str, {
        chat_id: msg.message.chat.id,
        message_id: msg.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": addWalletKeyboard
        }
    })
}
export const walletTemplate = async (bot: any, msg: any, db: any) => {
    let wallets = await db.select("wallet", [`telegram_id=${msg.from.id}`])
    let str = ``
    if (wallets.length) {
        str += `❗️❗️❗️ <b>Please identify the real DogeBot, please do not send it to the scammer bot</b>\n\n<b>A total of ${wallets.length} wallets are bound</b>\n\n`
        wallets.forEach((item, index) => {
            str += `<b>(${index + 1}) ${item.address}</b>\n`
        })
    } else {
        str = "❗️❗️❗️ <b>Please look for Tugou BOT and do not send it to the scammer robot by mistake</b>\n\n<b>If you haven’t bound your wallet yet, click the Add button below to add a wallet.</b>\n\n"
    }
    bot.editMessageText(str, {
        chat_id: msg.message.chat.id,
        message_id: msg.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": walletKeyboard
        }
    })
}
export const rushTemplate = async (bot: any, msg: any, db: any) => {
    let time = Math.round(new Date().getTime() / 1000) - 1800
    let result = await db.leftJoin("task", "contract", [`telegram_id=${msg.chat.id}`, "type=5", `start_time>=${time}`], [], "target", "address")
    let str = "❗️❗️❗️ <b>Investing in assets that are in a downtrend is risky, please be cautious</b>\n\n"
    let listKeyboard = []
    result.list.forEach(item => {
        listKeyboard.push([{
            text: item.name,
            callback_data: `/rush_detail ${item.id}`
        }])
    })
    listKeyboard.push([{
        text: '💳 Add to open',
        callback_data: "add_rush"
    }])
    listKeyboard.push(defaultKeyboard)
    bot.editMessageText(str, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": listKeyboard
        }
    })
}
export const handleWatchTemplate = async (bot: any, msg: any, address: string, db: any) => {
    let find = await db.find("watch", [`address='${address}'`, `telegram_id=${msg.from.id}`])
    const web3 = new Web3()
    if (find) {
        let str = `👀 *Monitor address*\n\n`
        str += "`" + address + "`\n\n"
        str += `📑 *Remark：${find.name ? find.name : '无'}*\n`
        str += `🚀 *Follow Buy：${find.follow_buy == 1 ? '✅' : '❌'}*\n`
        str += `🚀 *Follow Sell：${find.follow_sell == 1 ? '✅' : '❌'}*\n`
        str += `💰 *Follow Amount：${find.follow_amount} ETH*\n`
        str += `⛽ *Follow Gas：${find.follow_gas_fee} Gwei*\n`
        str += `💦 *Follow Slippage${find.follow_swap_fee} %*\n`
        let account = find.follow_private_key ? web3.eth.accounts.privateKeyToAccount(find.follow_private_key) : null
        const followKeyboard = [
            [
                {
                    text: `💳 (${account ? account.address.substring(account.address.length - 15, account.address.length) : 'Select wallet'})`,
                    callback_data: `/picker_follow_wallet ${find.id}`
                },
            ],
            [
                {
                    text: `🚀 Follow Buy ${find.follow_buy == 1 ? '✅' : '❌'}`,
                    callback_data: `/set_follow_buy 5 ${find.id}`
                },
                {
                    text: `🚀 Follow Sell ${find.follow_sell == 1 ? '✅' : '❌'}`,
                    callback_data: `/set_follow_sell 5 ${find.id}`
                },
            ],
            [
                {
                    text: `⛽ (${find.follow_gas_fee} Gwei)`,
                    callback_data: `/set_follow_gas_fee 5 ${find.id}`
                },
                {
                    text: `💦 Slippage(${find.follow_swap_fee} %)`,
                    callback_data: `/set_follow_swap_fee 5 ${find.id}`
                },
            ],
            [
                {
                    text: `💰 Buy amount(${find.follow_amount} ETH)`,
                    callback_data: `/set_follow_amount 5 ${find.id}`
                }
            ],
            [
                {
                    text: `📑 Remark Name`,
                    callback_data: `/bind_watch_name ${address}`
                },
                {
                    text: `❌ Remove Watch`,
                    callback_data: `/delete_watch ${address}`
                },
            ],
            [
                {
                    text: '↪️ Return',
                    callback_data: "watch"
                }

            ]
        ]
        bot.editMessageText(str, {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            "parse_mode": "markdown",
            "reply_markup": {
                "inline_keyboard": followKeyboard
            }
        }
        )
    } else {
        bot.sendMessage(msg.message.chat.id, "Monitor address not found")
    }
}
export const watchTemplate = async (bot: any, msg: any, db: any) => {
    let watchList = await db.select("watch", [`telegram_id=${msg.from.id}`])
    let str = ``
    let watchKeyboard = []
    if (watchList.length) {
        str += `👀 *List of monitored addresses*\n\n`
        str += `*Total of (${watchList.length}) addresses monitored, with (${10 - watchList.length}) remaining spots*\n\n`
        watchList.forEach((item, index) => {
            let isFollow = (item.follow_buy == 1 || item.follow_sell == 1) ? "（Follow enabled）\n" : ""
            str += "Wallet(" + (index + 1) + ")\n`" + item.address + "`\n" + isFollow + "\n"
            let text = item.name ? `${item.address.substring(item.address.length - 16, item.address.length)}(${item.name})` : `${item.address.substring(item.address.length - 16, item.address.length)}`
            watchKeyboard.push([
                {
                    text: text,
                    callback_data: `/handle_watch ${item.address}`
                }
            ])
        })
    } else {
        str = "👀 *List of monitored addresses</b>\n\n<b>There are no monitored addresses yet. Add one below!*"
    }
    watchKeyboard.push([
        {
            text: '👀 Add new watch address',
            callback_data: "add_watch"
        }
    ])
    watchKeyboard.push([...defaultKeyboard])
    bot.editMessageText(str, {
        chat_id: msg.message.chat.id,
        message_id: msg.message.message_id,
        parse_mode: "MARKDOWN",
        reply_markup: {
            "inline_keyboard": watchKeyboard
        }
    })
}
export const editorWatchLogBuyTemplate = async (bot: any, contract: any, watchLog: any, user: any, currentGasPrice: number, wethPrice: number) => {
    let tx = getTxScan(watchLog.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: watchLog.address }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, watchLog.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Buy：${watchLog.amount_in} ETH</b>\n` +
        `<b>💵 Received：${watchLog.amount_out} ${contract.symbol}</b>\n` +
        `<b>🚨 Type：Monitor address</b>\n` +
        `<b>⏳ Status：Success</b>\n` +
        `<b>💰 Total Cost：$ ${watchLog.cost}</b>\n` +
        `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        `<b>💦 Buy Tax: ${watchLog.swap_fee} %</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Buy Address:</b>\n` +
        `<b>${watchLog.address}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 4 ${watchLog.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 4 ${watchLog.id}`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 4 ${watchLog.id}`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 ${watchLog.id}`
            },
        ],
    ]
    bot.editMessageText(str, {
        chat_id: user.query.message.chat.id,
        message_id: user.query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": buyKeyboard
        }
    })
}
export const editorWatchLogSellTemplate = async (bot: any, contract: any, watchLog: any, user: any, currentGasPrice: number, wethPrice: number) => {
    let tx = getTxScan(watchLog.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: watchLog.address }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, watchLog.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Sold：${watchLog.amount_in} ${contract.symbol}</b>\n` +
        `<b>💵 Received：${watchLog.amount_out} ETH</b>\n` +
        `<b>🚨 Type：Monitor address</b>\n` +
        `<b>⏳ Status：Success</b>\n` +
        `<b>💰 Total Income：$ ${watchLog.cost}</b>\n` +
        `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        `<b>💦 Sell Tax: ${watchLog.swap_fee} %</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Buy Address:</b>\n` +
        `<b>${watchLog.address}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 4 ${watchLog.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 4 ${watchLog.id}`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 4 ${watchLog.id}`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 0`
            },
        ],
    ]
    bot.editMessageText(str, {
        chat_id: user.query.message.chat.id,
        message_id: user.query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            "inline_keyboard": buyKeyboard
        }
    })
}
export const watchLogBuyTemplate = async (bot: any, contract: any, watchLog: any, user: any, currentGasPrice: number, wethPrice: number) => {
    let tx = getTxScan(watchLog.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: watchLog.address }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, watchLog.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Buy：${watchLog.amount_in} ETH</b>\n` +
        `<b>💵 Received：${watchLog.amount_out} ${contract.symbol}</b>\n` +
        `<b>🚨 Type：Monitor address</b>\n` +
        `<b>⏳ Status：Success</b>\n` +
        `<b>💰 Total Cost：$ ${watchLog.cost}</b>\n` +
        `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        `<b>💦 Buy Tax: ${watchLog.swap_fee} %</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Buy Address:</b>\n` +
        `<b>${watchLog.address}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 4 ${watchLog.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 4 ${watchLog.id}`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 4 ${watchLog.id}`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 0`
            },
        ],
    ]
    bot.sendMessage(watchLog.telegram_id, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": buyKeyboard
        }
    }
    )
}
export const watchLogSellTemplate = async (bot: any, contract: any, watchLog: any, user: any, currentGasPrice: number, wethPrice: number) => {
    let tx = getTxScan(watchLog.hash, contract.chain_id)
    let scan = getScan(contract.address, contract.chain_id)
    let poolEthBalance = 0
    let poolTokenBalance = 0
    let poolPercent = 0
    let price = '0'
    let userCoinBalance = 0
    let userEthBalance = 0
    let coinBalance = await batchCheckERC20Balance([{ contractAddr: contract.address, owner: watchLog.address }], contract.chain_id)
    let ethBalance = await getBalance(contract.chain_id, watchLog.address)
    if (coinBalance.length) {
        userCoinBalance = Number((Number(coinBalance[0].balance) / (10 ** Number(coinBalance[0].decimals))).toFixed(4))
    }
    userEthBalance = Number((Number(ethBalance) / (10 ** 18)).toFixed(4))
    if (contract.fastGetContractPrice.pool) {
        poolEthBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve0) : Number(contract.fastGetContractPrice.pool.reserve1)
        poolTokenBalance = contract.fastGetContractPrice.pool.token0 == Config[contract.chain_id].stableContract[0] ? Number(contract.fastGetContractPrice.pool.reserve1) : Number(contract.fastGetContractPrice.pool.reserve0)
        poolPercent = Number((poolTokenBalance / Number(contract.total_supply) * 100).toFixed(3))
        price = BigNumber((Number(contract.fastGetContractPrice.price) * Number(wethPrice)).toFixed(15)).toFixed()
    }
    let firstPriceDom = ""
    if (Number(contract.first_price) > 0 && Number(price) > 0) {
        let firstPrice = BigNumber((Number(contract.first_price) * wethPrice).toFixed(15)).toFixed()
        let percent = 0
        if (Number(firstPrice) > Number(price)) {
            percent = -Number(((1 - Number(price) / Number(firstPrice)) * 100).toFixed(2))
        } else {
            percent = Number(((Number(price) / Number(firstPrice) - 1) * 100).toFixed(2))
        }
        firstPriceDom += `<b>💵 Initial Price: $ ${firstPrice}</b>\n`
        firstPriceDom += `<b>📈 Change: ${percent} %</b>\n`
    }
    let swapFeeDom = ""
    if (contract.is_get_swap_fee == 1) {
        swapFeeDom += `<b>💦 Buy Tax: ${contract.buy_fee} %</b>\n`
        swapFeeDom += `<b>💦 Sell Tax: ${contract.sell_fee} %</b>\n`
    }
    let total = Number(contract.total_supply) / (10 ** Number(contract.decimals))
    let dex = getDexTool(contract.address, contract.chain_id)
    let str = `🎰 <b>${contract.name}(<a href='${scan}'>$${contract.symbol}</a>) # ${chainEnum[contract.chain_id]}</b>\n\n` +
        `<b>🏫 Contract Address:</b>\n` +
        `<b>${contract.address}</b>\n` +
        `<b>🏤 Pool Address:</b>\n` +
        `<b>${contract.fastGetContractPrice.pool ? contract.fastGetContractPrice.pool.pool : 'No Pool'}</b>\n\n` +
        `<b>🛒 DEX: ${dexNames[contract.chain_id][contract.fastGetContractPrice.pool.version]}</b>\n` +
        `<b>💵 Sell：${watchLog.amount_in} ${contract.symbol}</b>\n` +
        `<b>💵 Received：${watchLog.amount_out} ETH</b>\n` +
        `<b>🚨 Type：Monitor address</b>\n` +
        `<b>⏳ Status：Success</b>\n` +
        `<b>💰 Total Income：$ ${watchLog.cost}</b>\n` +
        `<b>🔎 Tx Details：<a href='${tx}'>Click here</a></b>\n\n` +
        `<b>⛽ GasPrice: ${currentGasPrice} Gwei</b>\n` +
        `<b>💵 Price: $ ${price}</b>\n` +
        `<b>💦 Sell Tax: ${watchLog.swap_fee} %</b>\n` +
        firstPriceDom +
        swapFeeDom +
        `<b>📺 Pool Proportion: ${poolPercent} %</b>\n` +
        `<b>🎀 Pool ETH: ${Number((poolEthBalance / (10 ** 18)).toFixed(5))} ETH</b>\n` +
        `<b>💎 Pool ${contract.symbol}: ${Number((poolTokenBalance / (10 ** Number(contract.decimals))).toFixed(5))} ${contract.symbol}</b>\n` +
        `<b>💰 Market Cap: $ ${formatUSDPrice(Number((total * Number(price)).toFixed(3)))}</b>\n\n` +
        `<b>📌 Buy Address:</b>\n` +
        `<b>${watchLog.address}</b>\n` +
        `<b>🎉 ${contract.symbol} Balance: ${userCoinBalance} ${contract.symbol}</b>\n` +
        `<b>📫 ETH Balance: ${userEthBalance} ETH</b>\n`
    const buyKeyboard = [
        [
            {
                text: `📈 Candlestick`,
                url: dex
            },
        ],
        [
            {
                text: `⛽ (${user.manual_gas_fee} Gwei)`,
                callback_data: `/set_gas_fee 4 ${watchLog.id}`
            },
            {
                text: `💦 Slippage(${user.manual_swap_fee} %)`,
                callback_data: `/set_swap_fee 4 ${watchLog.id}`
            },
        ],
        [
            {
                text: `💰 Buy amount(${user.amount} ETH)`,
                callback_data: `/set_buy_amount 4 ${watchLog.id}`
            }
        ],
        [
            {
                text: `🚀 Buy`,
                callback_data: `/buy ${contract.chain_id} ${contract.address} 1 0`
            },
        ],
    ]
    bot.sendMessage(watchLog.telegram_id, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": buyKeyboard
        }
    }
    )
}
export const topFiveMinutesTemplate = async (bot: any, chatId: number, list: any[]) => {
    let str = ""
    let buyKeyboard = []
    list.forEach(item => {
        let scan = getScan(item.address, item.chainId)
        str += `🎰 <b>(<a href='${scan}'>$${item.symbol}</a>) # ${chainEnum[item.chainId]}</b>\n` +
            `🔁 <b>Trade count：${item.count} (${item.countPercent} %)</b>\n` +
            `👬 <b>Holders：${item.currentHolders} (${item.holdersPercent} %)</b>\n` +
            `💡 <b>Smart Money：${item.smartMoney}</b>\n` +
            `💵 <b>Price：$ ${item.currentPrice} (${item.pricePercent} %)</b>\n` +
            `💵 <b>Change：${item.historyPercent} %</b>\n` +
            `💧 <b>Top 20 Holders：${item.topHolderPercent} %</b>\n` +
            `💰 <b>Net Inflow：${item.allInflow} ETH</b>\n\n`
        buyKeyboard.push([
            {
                text: `🚀 Buy${item.symbol}`,
                callback_data: `/send_contract ${item.address}`
            }
        ])
    })
    bot.sendMessage(chatId, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": buyKeyboard
        }
    }
    )
}
export const topFifteenMinutesTemplate = async (bot: any, chatId: number, list: any[]) => {
    let str = ""
    let buyKeyboard = []
    list.forEach(item => {
        let scan = getScan(item.address, item.chainId)
        str += `🎰 <b>(<a href='${scan}'>$${item.symbol}</a>) # ${chainEnum[item.chainId]}</b>\n` +
            `🔁 <b>Trade Count：${item.count} (${item.countPercent} %)</b>\n` +
            `👬 <b>Highest Holders in 30 Minutes：${item.hightHolders}</b>\n` +
            `👬 <b>Holders：${item.currentHolders} (${item.holdersPercent} %)</b>\n` +
            `💡 <b>Smart Money：${item.smartMoney}</b>\n` +
            `💵 <b>Highest Price in 30 Minutes：$ ${item.hightPrice}</b>\n` +
            `💵 <b>Price：$ ${item.currentPrice} (${item.pricePercent} %)</b>\n` +
            `💵 <b>Change：${item.historyPercent} %</b>\n` +
            `💧 <b>Top 20 Holders：${item.topHolderPercent} %</b>\n` +
            `💰 <b>Net Inflow：${item.allInflow} ETH</b>\n\n`
        buyKeyboard.push([
            {
                text: `🚀 Buy${item.symbol}`,
                callback_data: `/send_contract ${item.address}`
            }
        ])
    })
    bot.sendMessage(chatId, str, {
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": buyKeyboard
        }
    }
    )
}
export const settingKeyboard = [
    [
        {
            text: 'Slippage',
            callback_data: "swap_fee"
        },
        {
            text: 'Gas Fee',
            callback_data: "gas_fee"
        },
        {
            text: 'Gas Fee',
            callback_data: "gas_fee"
        }
    ],
]
export const addWalletKeyboard = [
    [
        {
            text: '➡️ Import Wallet',
            callback_data: "import_wallet"
        }
    ],
    [
        {
            text: '⬅️ Generate Wallet',
            callback_data: "generate_wallet"
        }
    ],
    [...defaultKeyboard]
]
export const walletKeyboard = [
    [
        {
            text: '💳 Add Wallet',
            callback_data: "add_wallet"
        },
        {
            text: '❌ Delete Wallet',
            callback_data: "delete_wallet"
        }
    ],
    [...defaultKeyboard]
]
export const homeKeyboard = [
    [
        {
            text: '💳 Wallet',
            callback_data: "wallet"
        },
    ],
    [
        {
            text: '🔭 Monitor address',
            callback_data: "watch"
        },
    ],
    [
        {
            text: '💰 Sniping',
            callback_data: "rush"
        },
        {
            text: '🔍 Smart Money Search',
            callback_data: "smart_money"
        }
    ],
    [
        {
            text: '🌎 RPC node Settings',
            callback_data: "set_prc"
        }
    ]
]