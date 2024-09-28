import { Router } from "express";
import dotenv from "dotenv";
import {
  createBookingApi,
  facilitiesListApi,
  centersListApi,
  login,
  register,
  viewBookingsApi,
  updateBookingApi,
  deleteBookingApi,
  slotAvailabilityApi,
} from "../controllers/slotBookingController";
import { authenticateJWT } from "../middlewares/authMiddleware";
dotenv.config();

const router = Router();

router.post("/auth/login", login);
router.post("/auth/register", register);
router.get("/centers", authenticateJWT, centersListApi);
router.get("/centers/:id/facilities", authenticateJWT, facilitiesListApi);
router.post("/bookings/create", authenticateJWT, createBookingApi);
router.get("/bookings/list", authenticateJWT, viewBookingsApi);
router.post("/bookings/delete", authenticateJWT, deleteBookingApi);
router.post("/bookings/update", authenticateJWT, updateBookingApi);
router.get("/bookings/slot_availability", authenticateJWT, slotAvailabilityApi);

export default router;
