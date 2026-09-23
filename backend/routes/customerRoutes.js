const express = require("express");
const router = express.Router();

const Customer = require("../models/Customer");

// ==========================================
// GET ALL CUSTOMERS
// ==========================================

router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find().sort({
      createdAt: -1,
    });

    res.status(200).json(customers);
  } catch (error) {
    console.error("Get customers error:", error);

    res.status(500).json({
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE CUSTOMER
// ==========================================

router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error("Get customer error:", error);

    res.status(500).json({
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
});

// ==========================================
// CREATE CUSTOMER
// ==========================================

router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      address,
      city,
      status,
      notes,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    const customer = new Customer({
      name,
      email,
      phone,
      company,
      address,
      city,
      status: status || "Active",
      notes,
    });

    const savedCustomer = await customer.save();

    res.status(201).json({
      message: "Customer created successfully",
      customer: savedCustomer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    res.status(500).json({
      message: "Failed to create customer",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE CUSTOMER
// ==========================================

router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      address,
      city,
      status,
      notes,
    } = req.body;

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    customer.name = name;
    customer.email = email;
    customer.phone = phone;
    customer.company = company;
    customer.address = address;
    customer.city = city;
    customer.status = status;
    customer.notes = notes;

    const updatedCustomer = await customer.save();

    res.status(200).json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    res.status(500).json({
      message: "Failed to update customer",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE CUSTOMER
// ==========================================

router.delete("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    res.status(500).json({
      message: "Failed to delete customer",
      error: error.message,
    });
  }
});

module.exports = router;