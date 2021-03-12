"use strict"
const ethers = require("ethers");
const BStablePool = require('./abi/BStablePool.json');
const BEP20 = require('./abi/BEP20.json');
const BigNumber = require('bignumber.js');
const https = require('https');
const log4js = require('log4js');
const config = require('./conf/conf.js');

log4js.configure(config.log4jsConfig);
const logger = log4js.getLogger('Defistation\'s Data Provider');
logger.info('Defistation\'s Data Provider start.');

const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

const pool1Address = '0x9c00954A8A58f5DDa8C011D6233093763F13C8Da';

const pool2Address = '0x27F545300F7b93c1c0184979762622Db043b0805';

const daiAddress = '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3';

const busdAddress = '0xe9e7cea3dedca5984780bafc599bd69add087d56';

const usdtAddress = '0x55d398326f99059ff775485246999027b3197955';

const qusdAddress = '0xb8c540d00dd0bf76ea12e4b4b95efc90804f924e';

const pool1Contract = new ethers.Contract(pool1Address, BStablePool.abi, provider);
const pool2Contract = new ethers.Contract(pool2Address, BStablePool.abi, provider);
const daiContract = new ethers.Contract(daiAddress, BEP20.abi, provider);
const busdContract = new ethers.Contract(busdAddress, BEP20.abi, provider);
const usdtContract = new ethers.Contract(usdtAddress, BEP20.abi, provider);
const qusdContract = new ethers.Contract(qusdAddress, BEP20.abi, provider);

let arrP = new Array();

arrP.push(daiContract.balanceOf(pool1Address));
arrP.push(busdContract.balanceOf(pool1Address));
arrP.push(usdtContract.balanceOf(pool1Address));
arrP.push(qusdContract.balanceOf(pool2Address));
arrP.push(busdContract.balanceOf(pool2Address));
arrP.push(usdtContract.balanceOf(pool2Address));

Promise.all(arrP).then(res => {
    let p1DAI_Bal = new BigNumber(ethers.utils.formatEther(res[0]));
    let p1BUSD_Bal = new BigNumber(ethers.utils.formatEther(res[1]));
    let p1USDT_Bal = new BigNumber(ethers.utils.formatEther(res[2]));
    let p2QUSD_Bal = new BigNumber(ethers.utils.formatEther(res[3]));
    let p2BUSD_Bal = new BigNumber(ethers.utils.formatEther(res[4]));
    let p2USDT_Bal = new BigNumber(ethers.utils.formatEther(res[5]));

    let tvl = p1DAI_Bal.plus(p1BUSD_Bal).plus(p1USDT_Bal).plus(p2QUSD_Bal).plus(p2BUSD_Bal).plus(p2USDT_Bal);
    logger.info('Total value locked: ' + tvl.toFormat(18, BigNumber.ROUND_DOWN));

    let body = {
        "tvl": tvl.toFixed(4, BigNumber.ROUND_HALF_UP),
        "volume": 0,
        "bnb": 0,
        "data": {
            "pairEntities": [
                {
                    "id": "0x9c00954A8A58f5DDa8C011D6233093763F13C8Da",
                    "token0": {
                        "symbol": "DAI"
                    },
                    "token1": {
                        "symbol": "BUSD"
                    },
                    "token2": {
                        "symbol": "USDT"
                    }
                },
                {
                    "id": "0x27F545300F7b93c1c0184979762622Db043b0805",
                    "token0": {
                        "symbol": "QUSD"
                    },
                    "token1": {
                        "symbol": "BUSD"
                    },
                    "token2": {
                        "symbol": "USDT"
                    }
                }
            ]
        },
        "test": false
    };
    let clientId = config.default.clientId;
    let clientSecret = config.default.key;
    let auth = 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');
    let bodyStr = JSON.stringify(body);
    let headers = {
        // 'Host': 'www.example.com',
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Content-Length': bodyStr.length
    };
    let options = {
        host: 'api.defistation.io',
        port: 443,
        path: '/dataProvider/tvl',
        method: 'POST',
        headers: headers
    };
    let req = https.request(options, (res) => {
        logger.info(`STATUS: ${res.statusCode}`);
        logger.info(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            logger.info(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            logger.info('No more data in response.');
        });
    });

    req.on('error', (e) => {
        logger.error(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(bodyStr);
    req.end();
});