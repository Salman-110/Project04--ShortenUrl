const urlModel = require('../Models/url')
const validUrl = require('valid-url')
const shortid = require('shortid')
const redis = require("redis");
const { promisify } = require("util");

//Connection to redis
const redisClient = redis.createClient(
    11923,
    "redis-11923.c212.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("b2mX5COsOCCuq8O9Nj8IaBtPxcSBcmT8", function (err) {
    if (err) throw err;
});
redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});
const SETEX_ASYNC = promisify(redisClient.SETEX).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

// -------------Post Api----------------
const longUrl = async function (req, res) {
    try{
    let data1 = req.body
    let longUrl = data1.longUrl
//---------------- Getting Data in Req body-------------//
    if (Object.keys(data1).length == 0) return res.status(404).send({ msg: "Please provide URL!!" })
    if (!longUrl) return res.status(404).send({ msg: "PLEASE ENTER LONG-URL!!" })
    if (!validUrl.isUri(longUrl)) return res.status(400).send({ msg: 'PLEASE ENTER VALID LONG-URL' })

//----------------Getting Data from redis--------------//
    const checkInCache = await GET_ASYNC(`${longUrl}`)
    if (checkInCache) {
        let obj = JSON.parse(checkInCache)
        console.log("Data from cache!!")
        return res.status(200).send({ status: "true",msg:"Already ShortUrl created!!", data: {longUrl: obj.longUrl, shortUrl: obj.shortUrl, urlCode: obj.urlCode } })
        }
// ---------------getting Data from MongoDB------------//
    let savedUrl = await urlModel.findOne({ longUrl: longUrl })
    if (savedUrl) return res.status(200).send({ status: true,  data: { longUrl: savedUrl.longUrl, shortUrl: savedUrl.shortUrl, urlCode: savedUrl.urlCode }})

// --------------Generating UrlCode and ShortUrl-------//   
    const urlCode = shortid.generate().toLowerCase()
    shortUrl = "http://localhost:3000/" + urlCode

    const data = {
        longUrl: longUrl,
        shortUrl: shortUrl,
        urlCode: urlCode
    };
//-------------Creating Data in MongoDB and Also Saving in Redis Cache-----///
    const savedData = await urlModel.create(data)
    await SETEX_ASYNC(`${longUrl}`,60*60, JSON.stringify(savedData))
    return res.status(201).send({ status: "true", data: { longUrl: savedData.longUrl, shortUrl: savedData.shortUrl, urlCode: savedData.urlCode } })
}
catch (err) {
    res.status(500).send({ Error: err.message })
}
}
module.exports.longUrl = longUrl

const getUrl = async (req, res) => {
    try {
        let urlCode = req.params.urlCode

        // ------finding longUrl in cache----------//
        let urlFromCache = await GET_ASYNC(`${urlCode}`)
        console.log("Url from cache")
        if (urlFromCache) return res.status(302).redirect(JSON.parse(urlFromCache))
       
        // ------finding urlData in MongoDB---------//
        let urlDataFromDB = await urlModel.findOne({ urlCode })
        if (!urlDataFromDB) return res.status(404).send({ status: false, message: "No longUrl found with this urlCode" })

        // ------Saving longUrl in Redis cache-------//
        await SETEX_ASYNC(`${urlCode}`, 60 * 60,JSON.stringify(urlDataFromDB.longUrl))
        console.log("Url from db")
        return res.status(302).redirect(urlDataFromDB.longUrl)
    }
    catch (err) {
        res.status(500).send({ Error: err.message })
    }
}
module.exports.getUrl=getUrl


