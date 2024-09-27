import { Request, Response, response } from "express";
import dotenv from "dotenv";
import { ParsedQs } from "qs";
const createPool = require("../config/db");
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here";
const db = createPool();

export const register = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, email, password } = req.body;

  // Input validation
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
      console.log("searchResults1:", searchResults);
      return res.status(404).send({
        success: false,
        message: "User already exists. use another email",
      });
    }

    const insertQuery =
      "insert into users (name, email, password) VALUES (?, ?, ?)";
    const [result] = await connection.query(insertQuery, [
      name,
      email,
      password,
    ]);
    const [user] = await connection.query(searchQuery, [email]);

    // console.log("Created new User:", user[0].first_name);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "successfully registered",
      user_details: user[0],
    });
  } catch (error) {
    const typedError = error as TypeError;
    console.error("Error creating user:", typedError.message);
    return res.status(404).send({
      success: false,
      message: typedError.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  // Input validation
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
    // Get a database connection
    connection = await db.getConnection();

    // Search for the user in the database
    const searchQuery = "SELECT * FROM users WHERE email = ?";
    const [searchResults] = (await connection.query(searchQuery, [
      email,
    ])) as any;

    if (searchResults.length === 0) {
      console.log("User doesn't exist", searchResults);
      return res.status(404).json({
        success: false,
        message: "User doesn't exist",
      });
    }

    // Extract user from the results
    const user = searchResults[0] as {
      id: number;
      email: string;
      password: string;
    };

    // Password validation
    if (user.password !== password) {
      return res.status(404).json({
        success: false,
        message: "invalid password",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "You Logged successfully",
      user: user,
      token: token,
    });
  } catch (error) {
    // Handle any errors
    console.error("Error fetching user:", (error as Error).message);
    return res.status(500).json({
      is_error: true,
      message: (error as Error).message,
    });
  } finally {
    // Release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
};

export const centersListApi = async (
  req: Request,
  res: Response
): Promise<Response> => {
  let connection;
  const { id } = req.query;
  try {
    connection = await db.getConnection();

    let searchQuery;
    let queryParams: (string | ParsedQs | string[] | ParsedQs[])[] = [];

    console.log("id====", id);

    if (id) {
      searchQuery = "SELECT * FROM centers WHERE id = ?";
      queryParams = [id];
    } else {
      searchQuery = "SELECT * FROM centers";
    }

    console.log('=====',searchQuery,queryParams)
    const [searchResults] = await connection.query(searchQuery, queryParams);

    return res.status(200).send({
      success: true,
      total_count: searchResults.length,
      data: searchResults,
    });
  } catch (error) {
    const typedError = error as TypeError;
    return res.status(404).send({
      success: false,
      message: typedError.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const facilitiesListApi = async (
  req: Request,
  res: Response
): Promise<Response> => {
  let connection;
  const { id } = req.params;
  console.log("id===", id);
  try {
    connection = await db.getConnection();
    if (!id) {
      return res.status(404).send({
        success: false,
        message: "Please send centers id",
      });
    }

    let searchQuery;
    let queryParams: (string | ParsedQs | string[] | ParsedQs[])[] = [];

    searchQuery = "SELECT * FROM facilities WHERE center_id = ?";
    queryParams = [id];

    const [searchResults] = await connection.query(searchQuery, queryParams);

    if (searchResults.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No facility for this center",
      });
    } else {
      return res.status(200).send({
        success: true,
        total_count: searchResults.length,
        data: searchResults,
      });
    }
  } catch (error) {
    const typedError = error as TypeError;
    return res.status(500).send({
      success: false,
      message: "Server error",
      error: typedError.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const createBookingApi = async (
  req: Request,
  res: Response
): Promise<Response> => {
  let connection;
  const { facility_id, user_id, booking_date, start_time, end_time } = req.body;

  try {
    connection = await db.getConnection();

    if (!facility_id || !user_id || !booking_date || !start_time || !end_time) {
      return res.status(400).send({
        success: false,
        message:
          "Booking request incomplete. Please provide all mandatory fields: facility ID, user ID, booking date, start time, and end time.",
      });
    }

    // Check if the facility exists and fetch available slots
    const facilityCheckQuery =
      "SELECT available_slots FROM facilities WHERE id = ?";
    const [facilityCheckResults] = await connection.query(facilityCheckQuery, [
      facility_id,
    ]);

    if (facilityCheckResults.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No facility found with the provided facility ID.",
      });
    }

    // Get available slots for the facility
    const facility = facilityCheckResults[0];
    let availableSlots;

    // Check if available_slots is already an object or a string
    if (typeof facility.available_slots === "string") {
      // Parse it if it's a string
      availableSlots = JSON.parse(facility.available_slots);
    } else {
      // Use it as is if it's already an object
      availableSlots = facility.available_slots;
    }

    // Check for conflicting bookings
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
        message:
          "This time slot is already booked. Please choose a different slot.",
      });
    }

    // Insert a new booking
    const insertBookingQuery = `
      INSERT INTO bookings (user_id, facility_id, booking_date, start_time, end_time) 
      VALUES (?, ?, ?, ?, ?)
    `;
    await connection.query(insertBookingQuery, [
      user_id,
      facility_id,
      booking_date,
      start_time,
      end_time,
    ]);

    // Remove the booked slot from the available_slots array
    const updatedSlots = availableSlots.filter((slot: any) => {
      return !(slot.start_time === start_time && slot.end_time === end_time);
    });

    // Update the facility's available slots in the database
    const updateFacilityQuery =
      "UPDATE facilities SET available_slots = ? WHERE id = ?";
    await connection.query(updateFacilityQuery, [
      JSON.stringify(updatedSlots), // Convert updated slots back to JSON
      facility_id,
    ]);

    // Success response
    return res.status(201).send({
      success: true,
      message: "Booking successfully created, and available slots updated.",
    });
  } catch (error) {
    const typedError = error as Error;
    console.error("Error creating booking:", typedError.message);
    return res.status(500).send({
      success: false,
      message: "Server error. Please try again later.",
      error: typedError.message,
    });
  } finally {
    // Release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
};

export const viewBookingsApi = async (
  req: Request,
  res: Response
): Promise<Response> => {
  let connection;
  const { id, facility_id, booking_date, customer_name } = req.query;

  try {
    connection = await db.getConnection();


    let bookingsQuery = "SELECT * FROM bookings WHERE 1=1";
    const queryParams: (string | number)[] = [];

    if (id) {
      bookingsQuery += " AND id = ?";
      queryParams.push(id as string);
    }

    if (facility_id) {
      bookingsQuery += " AND facility_id = ?";
      queryParams.push(facility_id as string);
    }

    if (booking_date) {
      bookingsQuery += " AND booking_date = ?";
      queryParams.push(booking_date as string);
    }

    if (customer_name) {
      bookingsQuery += " AND customer_name LIKE ?";
      queryParams.push(`%${customer_name}%`);
    }

    const [bookingsResults] = await connection.query(
      bookingsQuery,
      queryParams
    );

    if (bookingsResults.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No bookings found with the provided filters.",
      });
    }

    return res.status(200).send({
      success: true,
      total_count: bookingsResults.length,
      data: bookingsResults,
    });
  } catch (error) {
    const typedError = error as Error;
    console.error("Error fetching bookings:", typedError.message);
    return res.status(500).send({
      success: false,
      message: "Server error. Please try again later.",
      error: typedError.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
