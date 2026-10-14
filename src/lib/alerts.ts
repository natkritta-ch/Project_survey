import Swal, { SweetAlertIcon } from "sweetalert2";

// Helper to check if dark mode is active
const isDarkMode = () => {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark")
  );
};

// Base config for modals
const getBaseConfig = () => {
  const dark = isDarkMode();
  return {
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    customClass: {
      popup: "custom-swal-popup font-sans",
      title: "custom-swal-title",
      htmlContainer: "custom-swal-text",
      confirmButton: "custom-swal-confirm",
      cancelButton: "custom-swal-cancel",
    },
    buttonsStyling: true,
  };
};

/**
 * แสดงกล่องข้อความแจ้งเตือนระดับทางการ (แทน window.alert)
 */
export const showAlert = async (
  title: string,
  message?: string,
  icon: SweetAlertIcon = "info"
) => {
  return Swal.fire({
    ...getBaseConfig(),
    title,
    text: message,
    icon,
    confirmButtonText: "ตกลง",
    confirmButtonColor:
      icon === "error"
        ? "#e11d48"
        : icon === "warning"
        ? "#f59e0b"
        : icon === "success"
        ? "#10b981"
        : "#4f46e5",
  });
};

export const showSuccess = (title: string, message?: string) => {
  return showAlert(title, message, "success");
};

export const showError = (title: string, message?: string) => {
  return showAlert(title, message, "error");
};

export const showWarning = (title: string, message?: string) => {
  return showAlert(title, message, "warning");
};

export const showInfo = (title: string, message?: string) => {
  return showAlert(title, message, "info");
};

/**
 * แจ้งเตือนมุมขวาบนแบบ Toast (ไม่บล็อกหน้าจอ สำหรับการแจ้งเตือนสั้นๆ)
 */
export const showToast = (title: string, icon: SweetAlertIcon = "success") => {
  const dark = isDarkMode();
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  return Toast.fire({
    icon,
    title,
  });
};

/**
 * กล่องยืนยันการทำรายการระดับทางการ (แทน window.confirm)
 * คืนค่า Promise<boolean> (true = กดยืนยัน, false = กดยกเลิกหรือปิดกล่อง)
 */
export const showConfirm = async ({
  title,
  text,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  isDanger = false,
  icon = "warning",
}: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  icon?: SweetAlertIcon;
}): Promise<boolean> => {
  const result = await Swal.fire({
    ...getBaseConfig(),
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: isDanger ? "#e11d48" : "#4f46e5",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: isDanger,
  });

  return result.isConfirmed;
};

/**
 * กล่องกรอกตัวเลข (แทน window.prompt สำหรับตัวเลข)
 */
export const showPromptNumber = async ({
  title,
  text,
  defaultValue = 15,
  confirmText = "บันทึก",
  cancelText = "ยกเลิก",
  min = 0,
  max = 180,
}: {
  title: string;
  text?: string;
  defaultValue?: number;
  confirmText?: string;
  cancelText?: string;
  min?: number;
  max?: number;
}): Promise<number | null> => {
  const result = await Swal.fire({
    ...getBaseConfig(),
    title,
    text,
    input: "number",
    inputValue: defaultValue,
    inputAttributes: {
      min: String(min),
      max: String(max),
      step: "1",
    },
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: "#4f46e5",
    cancelButtonColor: "#64748b",
  });

  if (result.isConfirmed && result.value !== undefined && result.value !== "") {
    return parseInt(result.value, 10);
  }
  return null;
};

