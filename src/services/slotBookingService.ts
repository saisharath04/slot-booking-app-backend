import { Router } from "express";
import dotenv from "dotenv";
import {
  createBookingApi,
  facilitiesListApi,
  centersListApi,
  login,
  register,
  viewBookingsApi,
} from "../controllers/slotBookingController";
import { authenticateJWT } from "../middlewares/authMiddleware";
dotenv.config();

const router = Router();

router.post("/auth/login", login);
router.post("/auth/register", register);
router.get("/centers", authenticateJWT, centersListApi);
router.get("/centers/:id/facilities", authenticateJWT, facilitiesListApi);
router.post("/bookings/create", authenticateJWT, createBookingApi);
router.post("/bookings/list", authenticateJWT, viewBookingsApi);

export default router;
