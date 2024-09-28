"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slotAvailabilityApi = exports.deleteBookingApi = exports.updateBookingApi = exports.viewBookingsApi = exports.createBookingApi = exports.facilitiesListApi = exports.centersListApi = exports.login = exports.register = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const createPool = require("../config/db");
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here";
const db = createPool();
const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!email) {
        return res.status(404).json({
            success: false,
            message: "email is required.",
        });
    }
    if (!password) {
        return res.status(404).json({
            success: false,
            message: "password is required.",
        });
    }
    if (!name) {
        return res.status(404).json({
            success: false,
            message: "name is required.",
        });
    }
    let connection;
    try {
        connection = await db.getConnection();
        const searchQuery = "select * FROM users WHERE email = ?";
        const [searchResults] = await connection.query(searchQuery, [email]);
        if (searchResults.length > 0) {
            return res.status(404).send({
                success: false,
                message: "User already exists. use another email",
            });
        }
        const insertQuery = "insert into users (name, email, password) VALUES (?, ?, ?)";
        await connection.query(insertQuery, [name, email, password]);
        const [user] = await connection.query(searchQuery, [email]);
        return res.status(200).send({
            status: 200,
            success: true,
            message: "successfully registered",
            user_details: user[0],
        });
    }
    catch (error) {
        const typedError = error;
        return res.status(404).send({
            success: false,
            message: typedError.message,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email) {
        return res.status(404).json({
            success: false,
            message: "email is required.",
        });
    }
    if (!password) {
        return res.status(404).json({
            success: false,
            message: "password is required.",
        });
    }
    let connection;
    try {
        connection = await db.getConnection();
        const searchQuery = "SELECT * FROM users WHERE email = ?";
        const [searchResults] = (await connection.query(searchQuery, [
            email,
        ]));
        if (searchResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User doesn't exist",
            });
        }
        // Extract user from the results
        const user = searchResults[0];
        // Password validation
        if (user.password !== password) {
            return res.status(404).json({
                success: false,
                message: "invalid password",
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: "3h",
        });
        // Return success response
        return res.status(200).json({
            success: true,
            message: "You Logged successfully",
            user_details: user,
            token: token,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.login = login;
const centersListApi = async (req, res) => {
    let connection;
    const { id } = req.query;
    try {
        connection = await db.getConnection();
        let searchQuery;
        let queryParams = [];
        if (id) {
            searchQuery = "SELECT * FROM centers WHERE id = ?";
            queryParams = [id];
        }
        else {
            searchQuery = "SELECT * FROM centers";
        }
        const [searchResults] = await connection.query(searchQuery, queryParams);
        return res.status(200).send({
            success: true,
            total_count: searchResults.length,
            centers: searchResults,
        });
    }
    catch (error) {
        const typedError = error;
        return res.status(404).send({
            success: false,
            message: typedError.message,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.centersListApi = centersListApi;
const facilitiesListApi = async (req, res) => {
    let connection;
    const { id } = req.params;
    try {
        connection = await db.getConnection();
        if (!id) {
            return res.status(404).send({
                success: false,
                message: "Please send centers id",
            });
        }
        let searchQuery;
        let queryParams = [];
        searchQuery = "SELECT * FROM facilities WHERE center_id = ?";
        queryParams = [id];
        const [searchResults] = await connection.query(searchQuery, queryParams);
        if (searchResults.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No facility for this center",
            });
        }
        else {
            return res.status(200).send({
                success: true,
                total_count: searchResults.length,
                data: searchResults,
            });
        }
    }
    catch (error) {
        const typedError = error;
        return res.status(500).send({
            success: false,
            message: typedError.message,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.facilitiesListApi = facilitiesListApi;
const createBookingApi = async (req, res) => {
    let connection;
    const { facility_id, user_id, customer_name, customer_phone_number, booking_date, slots, } = req.body;
    try {
        connection = await db.getConnection();
        if (!facility_id ||
            !user_id ||
            !booking_date ||
            !Array.isArray(slots) ||
            slots.length === 0 ||
            !customer_name ||
            !customer_phone_number) {
            return res.status(400).send({
                success: false,
                message: "Booking request incomplete. Please provide facility ID, user ID, booking date, customer name,Customer phone number and at least one time slot.",
            });
        }
        const facilityCheckQuery = "SELECT available_slots FROM facilities WHERE id = ?";
        const [facilityCheckResults] = await connection.query(facilityCheckQuery, [
            facility_id,
        ]);
        if (facilityCheckResults.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No facility found with the provided facility ID.",
            });
        }
        const facility = facilityCheckResults[0];
        let availableSlots;
        if (typeof facility.available_slots === "string") {
            availableSlots = JSON.parse(facility.available_slots);
        }
        else {
            availableSlots = facility.available_slots;
        }
        for (const { start_time, end_time } of slots) {
            // Validate the start_time and end_time for each slot
            if (!start_time || !end_time) {
                return res.status(400).send({
                    success: false,
                    message: "Each slot must include both start_time and end_time.",
                });
            }
            // Check for conflicting bookings for each slot
            const conflictCheckQuery = `
        SELECT * FROM bookings 
        WHERE facility_id = ? 
        AND booking_date = ? 
        AND (start_time < ? AND end_time > ?)
      `;
            const [conflictResults] = await connection.query(conflictCheckQuery, [
                facility_id,
                booking_date,
                end_time,
                start_time,
            ]);
            if (conflictResults.length > 0) {
                return res.status(409).send({
                    success: false,
                    message: `The time slot from ${start_time} to ${end_time} is already booked. Please choose a different slot.`,
                });
            }
            // Insert a new booking for each slot
            const insertBookingQuery = `
        INSERT INTO bookings (user_id, facility_id, booking_date, start_time, end_time,customer_name,customer_phone_number) 
        VALUES (?, ?, ?, ?, ?,?,?)
      `;
            await connection.query(insertBookingQuery, [
                user_id,
                facility_id,
                booking_date,
                start_time,
                end_time,
                customer_name,
                customer_phone_number,
            ]);
        }
        // Success response after all bookings are made
        return res.status(201).send({
            success: true,
            message: "Bookings successfully created, and available slots updated.",
        });
    }
    catch (error) {
        const typedError = error;
        return res.status(500).send({
            success: false,
            message: typedError.message,
        });
    }
    finally {
        // Release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
};
exports.createBookingApi = createBookingApi;
const viewBookingsApi = async (req, res) => {
    let connection;
    const { id, facility_id, booking_date, customer_name, page = 1, per_page = 10, } = req.query;
    try {
        connection = await db.getConnection();
        let bookingsQuery = "SELECT u.name as user_name, b.* ,f.name as facility_name, c.name as center_name " +
            "FROM bookings AS b " +
            "INNER JOIN facilities AS f ON f.id = b.facility_id " +
            "INNER JOIN centers AS c ON c.id = f.center_id " +
            "INNER JOIN users AS u ON b.user_id = u.id WHERE 1=1";
        let countQuery = "SELECT COUNT(*) as total_count " +
            "FROM bookings AS b " +
            "INNER JOIN facilities AS f ON f.id = b.facility_id " +
            "INNER JOIN centers AS c ON c.id = f.center_id " +
            "INNER JOIN users AS u ON b.user_id = u.id WHERE 1=1";
        const queryParams = [];
        if (id) {
            bookingsQuery += " AND b.id = ?";
            countQuery += " AND b.id = ?";
            queryParams.push(id);
        }
        if (facility_id) {
            bookingsQuery += " AND b.facility_id = ?";
            countQuery += " AND b.facility_id = ?";
            queryParams.push(facility_id);
        }
        if (booking_date) {
            bookingsQuery += " AND b.booking_date = ?";
            countQuery += " AND b.booking_date = ?";
            queryParams.push(booking_date);
        }
        if (customer_name) {
            bookingsQuery += " AND b.customer_name LIKE ?";
            countQuery += " AND b.customer_name LIKE ?";
            queryParams.push(`%${customer_name}%`);
        }
        bookingsQuery += " ORDER BY b.id DESC";
        const offset = (parseInt(page, 10) - 1) * parseInt(per_page, 10);
        bookingsQuery += " LIMIT ? OFFSET ?";
        queryParams.push(parseInt(per_page), offset);
        const [bookingsResults] = await connection.query(bookingsQuery, queryParams);
        const [countResults] = await connection.query(countQuery, queryParams.slice(0, -2));
        return res.status(200).send({
            success: true,
            total_count: countResults[0].total_count,
            booking_list: bookingsResults,
            current_page: parseInt(page, 10),
            total_pages: Math.ceil(countResults[0].total_count / parseInt(per_page, 10)),
        });
    }
    catch (error) {
        const typedError = error;
        return res.status(500).send({
            success: false,
            message: typedError.message,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.viewBookingsApi = viewBookingsApi;
const updateBookingApi = async (req, res) => {
    let connection;
    const { id, user_id, facility_id, booking_date, start_time, end_time, customer_name, customer_phone_number, } = req.body;
    try {
        connection = await db.getConnection();
        if (!id) {
            return res.status(400).send({
                success: false,
                message: "Please provide booking ID",
            });
        }
        // Check if the booking exists
        const bookingCheckQuery = "SELECT * FROM bookings WHERE id = ?";
        const [bookingCheckResults] = await connection.query(bookingCheckQuery, [
            id,
        ]);
        if (bookingCheckResults.length === 0) {
            return res.status(404).send({
                success: false,
                message: `No booking found with the provided booking ID: ${id}`,
            });
        }
        // check whether facility id and user id valid or not
        if (facility_id) {
            const facilityIdCheckQuery = "select * from facilities where id = ?";
            const [facilitiesIdResult] = await connection.query(facilityIdCheckQuery, [facility_id]);
            if (facilitiesIdResult.length === 0) {
                return res.status(404).send({
                    success: false,
                    message: "Please check facility id",
                });
            }
        }
        if (user_id) {
            const userIdCheckQuery = "select * from users where id = ?";
            const [userIdResult] = await connection.query(userIdCheckQuery, [
                user_id,
            ]);
            if (userIdResult.length === 0) {
                return res.status(404).send({
                    success: false,
                    message: "Please check user id",
                });
            }
        }
        // Check for conflicting bookings in the new time slot for the same facility and date
        const conflictCheckQuery = `
      SELECT * FROM bookings 
      WHERE facility_id = ? 
      AND booking_date = ? 
      AND (start_time < ? AND end_time > ?)
      AND id != ?  -- Exclude the current booking being updated
    `;
        const [conflictResults] = await connection.query(conflictCheckQuery, [
            facility_id,
            booking_date,
            end_time,
            start_time,
            id,
        ]);
        if (conflictResults.length > 0) {
            return res.status(409).send({
                success: false,
                message: `The time slot from ${start_time} to ${end_time} is already booked. Please choose a different slot.`,
            });
        }
        const updateBookingQuery = `
      UPDATE bookings 
      SET user_id = ?, facility_id = ?, booking_date = ?, start_time = ?, end_time = ?, customer_name = ?, customer_phone_number = ?
      WHERE id = ?
    `;
        await connection.query(updateBookingQuery, [
            user_id ?? bookingCheckResults[0].user_id,
            facility_id ?? bookingCheckResults[0].facility_id,
            booking_date ?? bookingCheckResults[0].booking_date,
            start_time ?? bookingCheckResults[0].start_time,
            end_time ?? bookingCheckResults[0].end_time,
            customer_name ?? bookingCheckResults[0].customer_name,
            customer_phone_number ?? bookingCheckResults[0].customer_phone_number,
            id,
        ]);
        // Success response
        return res.status(200).send({
            success: true,
            message: `Booking with ID ${id} successfully updated.`,
        });
    }
    catch (error) {
        const typedError = error;
        return res.status(500).send({
            success: false,
            message: typedError.message,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.updateBookingApi = updateBookingApi;
const deleteBookingApi = async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(404).send({
            success: false,
            message: "Please send booking id",
        });
    }
    let connection;
    try {
        connection = await db.getConnection();
        const bookingCheckQuery = `select * from bookings where id = ?`;
        const bookingCheckQueryParams = [id];
        const [bookingCheckResults] = await connection.query(bookingCheckQuery, bookingCheckQueryParams);
        if (bookingCheckResults.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Booking ID not found",
            });
        }
        const deleteQuery = `delete from bookings where id = ?`;
        const deleteQueryParams = [id];
        await connection.query(deleteQuery, deleteQueryParams);
        return res.status(200).send({
            message: "Booking is deleted successfully",
            success: true,
        });
    }
    catch (error) {
        const typeError = error;
        return res.status(500).send({
            message: `${typeError?.message}`,
            success: false,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.deleteBookingApi = deleteBookingApi;
const slotAvailabilityApi = async (req, res) => {
    const { booking_date, facility_id } = req.query;
    if (!booking_date || !facility_id) {
        return res.status(400).send({
            success: false,
            message: "Please send booking date and facility id",
        });
    }
    let connection;
    try {
        connection = await db.getConnection();
        const availabilitySlotsQuery = "SELECT available_slots FROM facilities WHERE id = ?";
        const [availabilitySlotsResults] = await connection.query(availabilitySlotsQuery, [facility_id]);
        if (availabilitySlotsResults.length === 0) {
            return res.status(400).send({
                success: false,
                message: "No slots available for this facility",
            });
        }
        const availabilitySlots = typeof availabilitySlotsResults[0].available_slots === "string"
            ? JSON.parse(availabilitySlotsResults[0].available_slots)
            : availabilitySlotsResults[0].available_slots;
        const data = await Promise.all(availabilitySlots.map(async (slot) => {
            const bookingCheckQuery = `
          SELECT * FROM bookings 
          WHERE booking_date = ? 
          AND start_time < ? 
          AND end_time > ?
          AND facility_id = ?
        `;
            const [bookingResult] = await connection.query(bookingCheckQuery, [
                booking_date,
                slot.end_time,
                slot.start_time,
                facility_id,
            ]);
            return {
                start_time: slot.start_time,
                end_time: slot.end_time,
                is_booked: bookingResult.length !== 0,
            };
        }));
        // Return the final result
        return res.status(200).send({
            success: true,
            available_slots: data,
        });
    }
    catch (error) {
        const typedError = error;
        return res.status(500).send({
            success: false,
            message: typedError.message,
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.slotAvailabilityApi = slotAvailabilityApi;
