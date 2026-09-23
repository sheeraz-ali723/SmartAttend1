const express = require("express");
const router = express.Router();

const Lead = require("../models/Lead");

// ==========================================
// GET ALL LEADS
// ==========================================

router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find().sort({
      createdAt: -1,
    });

    res.status(200).json(leads);
  } catch (error) {
    console.error("Get leads error:", error);

    res.status(500).json({
      message: "Failed to fetch leads",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE LEAD
// ==========================================

router.get("/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    res.status(200).json(lead);
  } catch (error) {
    console.error("Get lead error:", error);

    res.status(500).json({
      message: "Failed to fetch lead",
      error: error.message,
    });
  }
});

// ==========================================
// CREATE LEAD
// ==========================================

router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      source,
      status,
      priority,
      value,
      notes,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    const lead = new Lead({
      name,
      email,
      phone,
      company,
      source: source || "Website",
      status: status || "New",
      priority: priority || "Medium",
      value: value || 0,
      notes,
    });

    const savedLead = await lead.save();

    res.status(201).json({
      message: "Lead created successfully",
      lead: savedLead,
    });
  } catch (error) {
    console.error("Create lead error:", error);

    res.status(500).json({
      message: "Failed to create lead",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE LEAD
// ==========================================

router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      source,
      status,
      priority,
      value,
      notes,
    } = req.body;

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    lead.name = name;
    lead.email = email;
    lead.phone = phone;
    lead.company = company;
    lead.source = source;
    lead.status = status;
    lead.priority = priority;
    lead.value = value;
    lead.notes = notes;

    const updatedLead = await lead.save();

    res.status(200).json({
      message: "Lead updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Update lead error:", error);

    res.status(500).json({
      message: "Failed to update lead",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE LEAD
// ==========================================

router.delete("/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    await Lead.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete lead error:", error);

    res.status(500).json({
      message: "Failed to delete lead",
      error: error.message,
    });
  }
});

module.exports = router;