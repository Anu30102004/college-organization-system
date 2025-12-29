import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-7d695253/health", (c) => {
  return c.json({ status: "ok" });
});

// Get all resources
app.get("/make-server-7d695253/resources", async (c) => {
  try {
    const resources = await kv.getByPrefix("resource:");
    return c.json({ success: true, resources });
  } catch (error) {
    console.log("Error fetching resources:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get resource by ID
app.get("/make-server-7d695253/resources/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const resource = await kv.get(`resource:${id}`);
    
    if (!resource) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }
    
    return c.json({ success: true, resource });
  } catch (error) {
    console.log("Error fetching resource:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create new resource
app.post("/make-server-7d695253/resources", async (c) => {
  try {
    const body = await c.req.json();
    const { id, name, type, capacity, location, description, status } = body;
    
    if (!id || !name || !type) {
      return c.json({ success: false, error: "Missing required fields: id, name, type" }, 400);
    }
    
    const resource = {
      id,
      name,
      type,
      capacity: capacity || null,
      location: location || "",
      description: description || "",
      status: status || "available",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`resource:${id}`, resource);
    return c.json({ success: true, resource });
  } catch (error) {
    console.log("Error creating resource:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update resource
app.put("/make-server-7d695253/resources/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`resource:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...body,
      id, // preserve ID
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`resource:${id}`, updated);
    return c.json({ success: true, resource: updated });
  } catch (error) {
    console.log("Error updating resource:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete resource
app.delete("/make-server-7d695253/resources/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`resource:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Resource not found" }, 404);
    }
    
    await kv.del(`resource:${id}`);
    
    // Also delete all bookings for this resource
    const bookings = await kv.getByPrefix(`booking:`);
    const resourceBookings = bookings.filter((b: any) => b.resourceId === id);
    if (resourceBookings.length > 0) {
      await kv.mdel(resourceBookings.map((b: any) => `booking:${b.id}`));
    }
    
    return c.json({ success: true, message: "Resource deleted successfully" });
  } catch (error) {
    console.log("Error deleting resource:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all bookings
app.get("/make-server-7d695253/bookings", async (c) => {
  try {
    const bookings = await kv.getByPrefix("booking:");
    return c.json({ success: true, bookings });
  } catch (error) {
    console.log("Error fetching bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create new booking with conflict detection
app.post("/make-server-7d695253/bookings", async (c) => {
  try {
    const body = await c.req.json();
    const { id, resourceId, userId, userName, userRole, startTime, endTime, purpose } = body;
    
    if (!id || !resourceId || !userId || !startTime || !endTime) {
      return c.json({ 
        success: false, 
        error: "Missing required fields: id, resourceId, userId, startTime, endTime" 
      }, 400);
    }
    
    // Check for conflicts
    const allBookings = await kv.getByPrefix("booking:");
    const conflicts = allBookings.filter((booking: any) => {
      if (booking.resourceId !== resourceId || booking.status === "cancelled") {
        return false;
      }
      
      const bookingStart = new Date(booking.startTime).getTime();
      const bookingEnd = new Date(booking.endTime).getTime();
      const newStart = new Date(startTime).getTime();
      const newEnd = new Date(endTime).getTime();
      
      return (newStart < bookingEnd && newEnd > bookingStart);
    });
    
    if (conflicts.length > 0) {
      return c.json({ 
        success: false, 
        error: "Booking conflict detected", 
        conflicts 
      }, 409);
    }
    
    const booking = {
      id,
      resourceId,
      userId,
      userName: userName || "Unknown User",
      userRole: userRole || "student",
      startTime,
      endTime,
      purpose: purpose || "",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`booking:${id}`, booking);
    return c.json({ success: true, booking });
  } catch (error) {
    console.log("Error creating booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Cancel booking
app.delete("/make-server-7d695253/bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const booking = await kv.get(`booking:${id}`);
    
    if (!booking) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    const updated = { ...booking, status: "cancelled" };
    await kv.set(`booking:${id}`, updated);
    
    return c.json({ success: true, booking: updated });
  } catch (error) {
    console.log("Error cancelling booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get utilization analytics
app.get("/make-server-7d695253/analytics/utilization", async (c) => {
  try {
    const resources = await kv.getByPrefix("resource:");
    const bookings = await kv.getByPrefix("booking:");
    
    const confirmedBookings = bookings.filter((b: any) => b.status === "confirmed");
    
    // Calculate utilization per resource type
    const utilizationByType: any = {};
    
    resources.forEach((resource: any) => {
      if (!utilizationByType[resource.type]) {
        utilizationByType[resource.type] = {
          type: resource.type,
          totalResources: 0,
          totalBookings: 0,
          totalHours: 0,
        };
      }
      utilizationByType[resource.type].totalResources += 1;
    });
    
    confirmedBookings.forEach((booking: any) => {
      const resource = resources.find((r: any) => r.id === booking.resourceId);
      if (resource && utilizationByType[resource.type]) {
        utilizationByType[resource.type].totalBookings += 1;
        
        const start = new Date(booking.startTime).getTime();
        const end = new Date(booking.endTime).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        utilizationByType[resource.type].totalHours += hours;
      }
    });
    
    const analytics = Object.values(utilizationByType);
    
    return c.json({ success: true, analytics });
  } catch (error) {
    console.log("Error generating analytics:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Initialize with demo data
app.post("/make-server-7d695253/initialize", async (c) => {
  try {
    // Check if already initialized
    const existing = await kv.getByPrefix("resource:");
    if (existing.length > 0) {
      return c.json({ success: true, message: "Already initialized" });
    }
    
    // Create demo resources
    const demoResources = [
      {
        id: "room-101",
        name: "Lecture Hall 101",
        type: "room",
        capacity: 100,
        location: "Building A, Floor 1",
        description: "Large lecture hall with projector and sound system",
        status: "available",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "room-201",
        name: "Computer Lab 201",
        type: "room",
        capacity: 30,
        location: "Building B, Floor 2",
        description: "Computer lab with 30 workstations",
        status: "available",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "proj-001",
        name: "HD Projector",
        type: "equipment",
        capacity: null,
        location: "Equipment Room",
        description: "Portable HD projector with HDMI connection",
        status: "available",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "book-001",
        name: "Data Structures & Algorithms",
        type: "book",
        capacity: null,
        location: "Library - Section C",
        description: "Comprehensive guide to DSA",
        status: "available",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    for (const resource of demoResources) {
      await kv.set(`resource:${resource.id}`, resource);
    }
    
    return c.json({ 
      success: true, 
      message: "Initialized with demo data", 
      count: demoResources.length 
    });
  } catch (error) {
    console.log("Error initializing data:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);