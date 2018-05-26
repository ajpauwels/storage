// Third-party libs
const express = require('express');

// Get the express router
const router = express.Router();

router.get('/', (req, res) => {
	res.send('Up and running');
});

module.exports = router;
