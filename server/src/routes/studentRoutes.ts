import { Router } from 'express';
import {
  registerStudent,
  loginStudent,
  getStudents,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { registerSchema, updateSchema, loginSchema } from '../validators/studentValidators';

const router = Router();

// Public
router.post('/register', validate(registerSchema), registerStudent);
router.post('/login', validate(loginSchema), loginStudent);

// Protected (JWT)
router.get('/students', requireAuth, getStudents);
router.put('/student/:id', requireAuth, validate(updateSchema), updateStudent);
router.delete('/student/:id', requireAuth, deleteStudent);

export default router;
