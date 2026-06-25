# Handoff — Fusion Pod Onboarding (Foundation + Multi-Pillar Roadmap)

**From:** Foundation/onboarding session
**To:** CX build session
**Date:** 2026-06-23

## What was built here
An agentic SI onboarding system for a freshly provisioned Fusion pod, covering the
flow **Provision → Phase 0 Install → Discovery → Foundation → Modules**, dependency-gated.

A single 46-task model spans 11 pillars: Foundation (common), Customer Data Cleansing,
ERP/Financials, SCM/Procurement/Mfg, Maintenance & Quality, HCM, CX (Sales/Service/CPQ),
Subscriptions, Marketing/Eloqua, PRM, and ICM.

## Deliverables (all in the Talk2Sql folder)
- `fusion-onboarding.html` — interactive artifact (also live as artifact `fusion-pod-onboarding`).
  Runs discovery, accepts BIP SQL to detect/validate pod state, gates modules by dependency.
- `Fusion_SI_Implementation_Playbook.docx` — narrative playbook + full module reference + detect/validate SQL appendix.
- `Fusion_Implementation_Tracker.xlsx` — 7-tab tracker: Phase 0, Discovery, Module Tracker (status + RACI + auto-BLOCKED), Dependencies, SQL Validation, Dashboard.

## How the CX work connects (dependencies the CX session should respect)
CX modules in the model and what they require first:
- **CX Sales: Resources & hierarchy** ← Security, Customer master
- **CX Sales: Products & Catalog** ← Inventory orgs & Item Master (PIM)
- **CX Sales: Territories** ← Resources, Customer master
- **CX Sales: Leads/Opportunities/Forecasting** ← Products, Territories
- **CPQ** ← CX Sales, Pricing
- **Fusion Service** ← Customer master, Products
- **Subscriptions** ← Customers, Pricing, AR
- **Marketing/Eloqua** ← Customer Data Cleansing, CX Sales
- **PRM** ← CX Sales, Customer (partner) accounts
- **ICM** ← Sales resources + HCM workforce structures, then OM/AR transactions to credit

Foundation gate: enterprise structures + security + geographies + clean TCA customer data
must be Done/validated before the CX transactional modules start.

## To use this in the CX session
Tell Claude there: "Read the Fusion handoff and deliverables in the Talk2Sql folder
(`HANDOFF_Fusion_Foundation.md`, the playbook, and the tracker) and reconcile the CX
work I did against the foundation dependencies and the Module Tracker."

Optionally, that session can also read this session's full transcript if session-history
tools are available there.
