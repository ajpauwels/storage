// Third-party libs
import { Request, Response, NextFunction, Router } from 'express';

// Get the express router
const router = Router();

router.get('/', (req: Request, res: Response) => {
	res.send('Up and running');
});

export default router;
