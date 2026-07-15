# Pricing Page — How Calculations Work

This document explains how the pricing page calculates the price for each item row, written in simple language for clients.

---

## Core Concept: Quantities × Rates

Each tool item (Code, Door, Handle, Hardware, Shelve) stores **quantities** — how many of each part the item needs. The Rate Chart (set in Settings → Set Pricings) stores the **price per unit** for each part.

> **Cost of a part = Quantity from the tool × Price per unit from the Rate Chart**

For example, if a Hardware item has a quantity of **2** in the **hanger pipe length** column and the Rate Chart says `Hanger Pipe Price/PC: 50`, then the cost contributed is `2 × 50 = 100`.

---

## Overview

Every item (row) in a pricing has a **Base Unit Price** built from 5 components:

> **Base Unit Price = Code + Finishing + Handle + Hardware + Shelve + Additional Costs**

Then:

- If the **PM (Profit Margin)** checkbox is checked, the base is increased by the profit margin percentage
- **Unit Price = Base Unit Price × (1 + Profit Margin ÷ 100)**
  - Example: if Profit Margin is 5%, then Unit Price = Base Unit Price × 1.05 (a 5% increase)
- **Total = Unit Price × Quantity** (rounded to nearest whole number)

Each component's rate comes from the **Rate Chart** set in **Settings → Set Pricings**. The system takes the quantity of each part from the tool database and multiplies it by the corresponding rate.

---

## The 5 Components

### 1️⃣ Code (Box / Carcass)

The cost of the main box body. Six parts are added up:

| Column in Table | What It Is | Rate Used |
|---|---|---|
| box sheet | Main box body | Box Sheet Price / PC |
| back sheet | Back panel of the box | Box Back Sheet Price / PC |
| top | Extra top sheet | Secondary Top Sheet Price / PC |
| edging | Edge banding on the box | Edging, Trimming Price / RFT |
| screws | Screws per box | Screws Price / PC |
| wall bracket | Wall mounting bracket | Wall Bracket Price / PC |

You can switch the **primary type** (dropdown near the rate input) to make "Box Back Sheet" or "Secondary Top" use a custom multiplier instead.

### 2️⃣ Finishing (Front Panel / Door)

The cost of the front door or panel. Two parts are added up:

| Column in Table | What It Is | Rate Used |
|---|---|---|
| panel area | The door / panel itself | Front Panel Sheet Price / PC |
| Edging | Edge banding on the door | Edging, Trimming Price / RFT (Doors) |

### 3️⃣ Handle

The cost of the handle or knob. One part:

| Column in Table | What It Is | Rate Used |
|---|---|---|
| Quantity | The handle / knob | Handles Price / PC / Length |

### 4️⃣ Hardware

The cost of hinges, sliders, locks, and other hardware. Up to **7 parts** are added up:

| Column in Table | What It Is | Rate Used |
|---|---|---|
| hinges set | Hinges set | Hinges Price / SET |
| sliders set | Drawer slider | Slider Price / SET |
| lift up set | Lift-up mechanism | Lift Up Price / SET |
| hanger pipe length | Hanging pipe | Hanger Pipe Price / PC |
| pipe fitting | Pipe fitting | Pipe Fitting Price / PC |
| locks | Lock set | Locks Price / PC |
| internal handle | Drawer internal handles | Internal Handles Price / PC |

You can change the **primary type** (dropdown) to "Slider" or "Lift Up" — that part then uses your custom multiplier instead of the default.

### 5️⃣ Shelve

The cost of adjustable shelves. Three parts are added up:

| Column in Table | What It Is | Rate Used |
|---|---|---|
| shelve area | The shelf board | Shelves Sheet Price / SFT |
| edging | Edge banding on the shelf | Edging, Trimming Price / RFT / Length |
| Pin Qty. | Shelf support pins | Shelve Pin Price / PC |

---

## Profit Margin (PM Checkbox)

- When **PM is checked** (default): the profit margin percentage is applied on top of the base unit price
- When **PM is unchecked**: no profit margin is added (base unit price is used as-is)
- The checkbox resets to **checked** after each row is added

## Show Discount Checkbox

- **Unchecked by default** — the discount field is hidden
- When checked: the discount field appears and is subtracted from the gross amount before tax

---

## Summary of the Flow

```
 1. Select Utility → Type → Code
    → System loads the code's quantities and calculates Code component

 2. Select Finishing (Door Panel)
    → System loads the door's quantities and calculates Finishing component

 3. Select Handle
    → System loads the handle's quantity and calculates Handle component

 4. Select Hardware
    → System loads all hardware part quantities and calculates Hardware component

 5. Select Shelves
    → System loads shelf quantities and calculates Shelve component

 6. Enter Quantity and Additional Costs (if any)

 7. Base Unit = Code + Finishing + Handle + Hardware + Shelve + Additional

 8. If PM checked: Unit Price = Base Unit × (1 + Profit Margin ÷ 100)

 9. Total = Unit Price × Quantity (rounded)

10. Gross Amount = sum of all rows' totals
    → Apply Discount → Apply Tax % → Add Delivery Charges → Net Amount
```

---

## Reference: Every Column and the Rate It Multiplies With

Each tool stores **quantities** in its columns. Below is the complete mapping.

### Code (Box Details)

| Column Shown in Table | Stores | Multiplied By (Rate Chart) |
|---|---|---|
| box sheet | Number of box sheets | Box Sheet Price / PC |
| back sheet | Number of back sheets | Box Back Sheet Price / PC |
| top | Number of secondary top sheets | Secondary Top Sheet Price / PC |
| edging | Edge banding length / count | Edging, Trimming Price / RFT |
| screws | Number of screws | Screws Price / PC |
| wall bracket | Number of wall brackets | Wall Bracket Price / PC |

**Example:** A Code item with **screws: 8** and **wall bracket: 2**, with Rate Chart values `Screws Price/PC: 5` and `Wall Bracket Price/PC: 30`:
- Screws cost = 8 × 5 = 40
- Wall Bracket cost = 2 × 30 = 60
- Total from these two parts = 100

---

### Door / Finishing

| Column Shown in Table | Stores | Multiplied By (Rate Chart) |
|---|---|---|
| panel area | Number of door panels | Front Panel Sheet Price / PC |
| Edging | Edge banding length / count | Edging, Trimming Price / RFT (Doors) |

**Example:** A Door item with **panel area: 1** and **Edging: 4**, with Rate Chart values `Front Panel Sheet Price/PC: 200` and `Edging Trimming Price/RFT (Doors): 15`:
- Panel cost = 1 × 200 = 200
- Edging cost = 4 × 15 = 60
- Total Finishing cost = 260

---

### Handle

| Column Shown in Table | Stores | Multiplied By (Rate Chart) |
|---|---|---|
| Quantity | Number of handles | Handles Price / PC / Length |

**Example:** A Handle item with **Quantity: 2**, with Rate Chart value `Handles Price/PC/Length: 80`:
- Handle cost = 2 × 80 = 160

---

### Hardware

| Column Shown in Table | Stores | Multiplied By (Rate Chart) |
|---|---|---|
| hinges set | Number of hinge sets | Hinges Price / SET |
| sliders set | Number of sliders | Slider Price / SET |
| lift up set | Number of lift-up mechanisms | Lift Up Price / SET |
| hanger pipe length | Number of hanger pipes | Hanger Pipe Price / PC |
| pipe fitting | Number of pipe fittings | Pipe Fitting Price / PC |
| locks | Number of lock sets | Locks Price / PC |
| internal handle | Number of internal handles | Internal Handles Price / PC |

**Example:** A Hardware item with **hanger pipe length: 1** and **locks: 2**, with Rate Chart values `Hanger Pipe Price/PC: 50` and `Locks Price/PC: 100`:
- Hanger Pipe cost = 1 × 50 = 50
- Locks cost = 2 × 100 = 200

---

### Shelve

| Column Shown in Table | Stores | Multiplied By (Rate Chart) |
|---|---|---|
| shelve area | Shelf sheet area / count | Shelves Sheet Price / SFT |
| edging | Edge banding length / count | Edging, Trimming Price / RFT / Length |
| Pin Qty. | Number of support pins | Shelve Pin Price / PC |

**Example:** A Shelve item with **shelve area: 3**, **edging: 2**, and **Pin Qty.: 4**, with Rate Chart values `Shelves Sheet Price/SFT: 100`, `Edging Trimming Price/RFT/Length: 10`, and `Shelve Pin Price/PC: 5`:
- Shelf sheet cost = 3 × 100 = 300
- Edging cost = 2 × 10 = 20
- Pin cost = 4 × 5 = 20
- Total Shelve cost = 340
