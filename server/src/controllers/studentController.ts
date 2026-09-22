import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { Student, ENCRYPTED_FIELDS, StudentRecord } from '../models/Student';
import { serverEncrypt, serverDecrypt, blindIndex } from '../utils/crypto';
import { ApiError, asyncHandler } from '../middleware/error';
import { RegisterInput, UpdateInput, LoginInput } from '../validators/studentValidators';

const SALT_ROUNDS = 10;

/**
 * Removes ONLY the server layer (Layer 2).
 * Values in the response are still Layer-1 (client) ciphertext.
 */
function toClientPayload(doc: StudentRecord) {
  const payload: Record<string, unknown> = {
    id: doc._id.toString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  for (const field of ENCRYPTED_FIELDS) {
    payload[field] = serverDecrypt(doc[field]);
  }
  return payload;
}

function assertValidId(id: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid student id');
  }
}

function signToken(studentId: string): string {
  return jwt.sign({ sub: studentId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

// POST /api/register
export const registerStudent = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RegisterInput;
  const emailIndex = blindIndex(body.emailHash);

  if (await Student.exists({ emailIndex })) {
    throw new ApiError(409, 'A student with this email already exists');
  }

  const doc: Record<string, string> = {
    emailIndex,
    password: await bcrypt.hash(body.password, SALT_ROUNDS),
  };
  for (const field of ENCRYPTED_FIELDS) {
    doc[field] = serverEncrypt(body[field]); // Layer 2 on top of Layer 1
  }

  const created = await Student.create(doc);

  res.status(201).json({
    message: 'Student registered successfully',
    student: toClientPayload(created.toObject() as unknown as StudentRecord),
  });
});

// POST /api/login
export const loginStudent = asyncHandler(async (req: Request, res: Response) => {
  const { emailHash, password } = req.body as LoginInput;

  const student = await Student.findOne({ emailIndex: blindIndex(emailHash) })
    .select('+password')
    .lean<StudentRecord>();

  const isMatch = student?.password ? await bcrypt.compare(password, student.password) : false;
  if (!student || !isMatch) {
    // Same message for both cases -> no user enumeration
    throw new ApiError(401, 'Invalid email or password');
  }

  res.json({
    message: 'Login successful',
    token: signToken(student._id.toString()),
    student: toClientPayload(student),
  });
});

// GET /api/students
export const getStudents = asyncHandler(async (_req: Request, res: Response) => {
  const students = await Student.find().sort({ createdAt: -1 }).lean<StudentRecord[]>();

  res.json({
    count: students.length,
    students: students.map(toClientPayload),
  });
});

// PUT /api/student/:id
export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  assertValidId(id);

  const body = req.body as UpdateInput;
  const update: Record<string, string> = {};

  for (const field of ENCRYPTED_FIELDS) {
    const value = body[field];
    if (value !== undefined) update[field] = serverEncrypt(value);
  }

  if (body.emailHash) {
    const emailIndex = blindIndex(body.emailHash);
    const taken = await Student.exists({ emailIndex, _id: { $ne: id } });
    if (taken) throw new ApiError(409, 'Another student already uses this email');
    update.emailIndex = emailIndex;
  }

  if (body.password) {
    update.password = await bcrypt.hash(body.password, SALT_ROUNDS);
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, 'Nothing to update');
  }

  const updated = await Student.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  ).lean<StudentRecord>();

  if (!updated) throw new ApiError(404, 'Student not found');

  res.json({ message: 'Student updated successfully', student: toClientPayload(updated) });
});

// DELETE /api/student/:id
export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  assertValidId(id);

  const deleted = await Student.findByIdAndDelete(id);
  if (!deleted) throw new ApiError(404, 'Student not found');

  res.json({ message: 'Student deleted successfully', id });
});
