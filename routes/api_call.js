var request = require('request');
var express = require('express');
var router = express.Router();

/** /api_call **/
router.get('/', function (req, res) {
    console.log("API");
    return res.json({ customers: global.Customers, statusCode: 200 });
});

module.exports = router;