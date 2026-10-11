const sendSmsNotification = async (phone: string, name: string, doctorName: string, date: string, serialNo: string) => {
  try {
    const response = await fetch('https://client.giosms.com/api/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 9|4KjApQNKFOrzY5teFNuZbfOzCKP9Dn4re5aPJfKW219943ad',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: `88${phone}`,
        message: `Dear ${name}, your appointment with ${doctorName} on ${date} is confirmed. Serial: ${serialNo}. Fee: 500 Tk.`,
        sender_id: '8809666720320',
        type: 'transactional'
      })
    });

    const result = await response.json();
    console.log("SMS Result:", result);
  } catch (error) {
    console.error("SMS Error:", error);
  }
};