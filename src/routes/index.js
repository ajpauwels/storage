// Third-party libs
var express_1 = require('express');
// Get the express router
var router = express_1.Router();
router.get('/', function (req, res) {
    res.send('Up and running');
});
exports["default"] = router;
