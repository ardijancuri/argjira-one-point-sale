# Remote POS Printing Integration Guide (Prototype Configuration)

**⚠️ DEVELOPER ATTENTION REQUIRED**: This solution relies on specific network and system configurations. You must update the variables below to match your specific deployment environment.

---

## **1. Configuration Checklist (DEV INPUT NEEDED)**

Before running the system, the development team must define and configure these three key variables:

| Variable | Description | Where to Change | Example Value |
| :--- | :--- | :--- | :--- |
| **`PRINTER_SHARE_NAME`** | The Windows Network Share name for the USB printer. | Windows Control Panel & `printer-server/server.js` | `"POS80"` or `"ReceiptPrinter"` |
| **`PRINTER_SERVER_IP`** | The IP address of the PC running the printer server. | Your Main App Config | `192.168.100.10` (Static IP recommended) |
| **`PRINTER_SERVER_PORT`** | The port the printer server listens on. | `printer-server/server.js` | `4000` (Default) |

---

## **2. Architecture Overview**

This solution uses a "Sidecar" pattern to bypass browser security restrictions.

```mermaid
graph LR
    A[Your Production Web App] -- HTTP POST --> B[Local Printer Server]
    B[Printer Server (Node.js)] -- Windows Spooler --> C[Physical USB Printer]
```

*   **Host Agnostic**: Your main app can be on Vercel, AWS, or a tablet.
*   **Local Bridge**: The `printer-server` must run on the **physical Windows machine** connected to the printer.

---

## **3. Printer Server Setup (Windows PC)**

The developer setting up the physical station must perform these steps:

### **A. Windows Printer Sharing (Manual Step)**
1.  Open **Control Panel** > **Devices and Printers**.
2.  Right-click your target printer > **Printer Properties**.
3.  Select the **Sharing** tab.
4.  Check **Share this printer**.
5.  **INPUT REQUIRED**: Enter a simple Share Name (no spaces recommended).
    *   *Decision*: Let's name it **`POS80`**.
6.  Click **Apply**.

### **B. Update Server Configuration**
1.  Open `printer-server/server.js`.
2.  Find the configuration line and update it if you chose a different share name:
    ```javascript
    // <--- DEV INPUT: Change this string to match your Windows Share Name
    const PRINTER_SHARE_NAME = "POS80"; 
    ```
3.  Start the server:
    ```bash
    npm start
    ```

---

## **4. Integration Logic (Frontend Developer)**

In your main application (React, Vue, Next.js, etc.), you need to point to the correct **Printer Server URL**.

### **Step A: Define the Endpoint**
You need to decide how to construct the URL based on where the user is accessing the app.

*   **Scenario 1: Mixed Use (Tablets & PC)** -> Use the PC's LAN IP.
*   **Scenario 2: Single PC (All-in-one)** -> Use `localhost`.

**Recommended Config Pattern:**
```javascript
// <--- DEV INPUT: Define the IP of the PC running the printer server
const PRINTER_HOST_IP = "192.168.1.100"; // EXTREMELY IMPORTANT: This IP must be static!
const PRINTER_PORT = "4000";

// Construct the URL
const PRINTER_API = `http://${PRINTER_HOST_IP}:${PRINTER_PORT}/print`;
```

### **Step B: The Print Function**
Add this function to your checkout logic. It requires no external libraries.

```javascript
async function sendRemotePrintJob(transactionData) {
  // 1. Format data to match Printer Server expectations
  const payload = {
    id: transactionData.orderId,
    date: new Date().toISOString(),
    total: transactionData.amount,
    items: transactionData.cartItems // Ensure this array has { name, price, quantity }
  };

  try {
    console.log(`Sending print job to: ${PRINTER_API}`);
    
    const response = await fetch(PRINTER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log("✅ Printer Server accepted the job.");
    } else {
      console.warn("⚠️ Printer Server warning:", result.warning);
    }
  } catch (error) {
    console.error("❌ CRTICAL: Cannot reach Printer Server.", error);
    alert(`Printer Setup Error: Cannot connect to ${PRINTER_API}. Is the server running?`);
  }
}
```

---

## **5. Prototype Validation Plan**

To validate this prototype before going to production, the dev team should:

1.  **Network Test**: Access `http://<PC_IP>:4000/test-connection` from the tablet browser to confirm visibility.
2.  **Static IP**: Ensure the Windows PC has a fixed IP address so the `PRINTER_HOST_IP` in your code doesn't break after a reboot.
3.  **Firewall**: Ensure Windows Defender Firewall allows traffic on Port `4000`.
