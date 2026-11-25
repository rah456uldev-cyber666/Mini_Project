// Optional defaults that are built into the app for every phone.
// Leave empty to let each user enter keys in Settings instead (recommended).
// WARNING: anything you put here can be read by anyone who unpacks the APK.
window.MB_CONFIG = {
  groqApiKey: "",
  groqModel: "",               // empty = pick automatically from your Groq account
  emailjsServiceId: "",        // free OTP by email: from emailjs.com (these are public ids, not secrets)
  emailjsTemplateId: "",
  emailjsPublicKey: "",
  emailjsPrivateKey: "",       // only if "Use Private Key" is ON in EmailJS > Account > Security
  fast2smsApiKey: "",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
  ollamaUrl: "",               // e.g. "http://192.168.43.10:11434" (laptop running Ollama)
  ollamaModel: "llama3.2:3b",
  defaultCountryCode: "+91"
};
