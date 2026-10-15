/**
 * ระบบวิเคราะห์และตรวจสอบความมีชีวิตจริงของใบหน้า (Anti-Spoofing & Liveness Detection)
 * พร้อมระบบตรวจสอบคุณภาพใบหน้า (ระยะห่าง, ขนาด, แสงสว่าง, คอนทราสต์)
 * สำหรับป้องกันการนำภาพถ่ายในโทรศัพท์มือถือหรือกระดาษมาหลอกกล้อง 2D
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceQualityResult {
  passed: boolean;
  score: number;
  faceSize: { width: number; height: number };
  sizeStatus: "too_small" | "too_large" | "optimal";
  distanceFeedback: string;
  luminance: number; // 0 - 255
  luminanceStatus: "too_dark" | "too_bright" | "optimal";
  lightingFeedback: string;
  contrast: number;
  contrastStatus: "low_contrast" | "optimal";
  overallFeedback: string;
}

export interface LivenessState {
  blinkCount: number;
  lastBlinkTime: number;
  eyeState: "OPEN" | "CLOSING" | "CLOSED";
  headPose: "FRONT" | "LEFT" | "RIGHT";
  challengeCompleted: boolean;
  historyEAR: number[];
}

/**
 * คำนวณระยะทาง Euclidean ระหว่างจุด 2 จุดใน 2D
 */
export function getDistance2D(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * คำนวณ Eye Aspect Ratio (EAR) ตามทฤษฎี Soukupová and Čech
 * Points: 6 จุดรอบดวงตา (ตาม 68 Landmarks ของ dlib/face-api.js)
 * ตาซ้าย: 36, 37, 38, 39, 40, 41
 * ตาขวา: 42, 43, 44, 45, 46, 47
 */
export function calculateEAR(eyePoints: Point2D[]): number {
  if (!eyePoints || eyePoints.length < 6) return 0.3;

  // p0=หัวตา, p3=หางตา, p1-p5 คือขอบตาบน-ล่างคู่แรก, p2-p4 คือคู่ที่สอง
  const vertical1 = getDistance2D(eyePoints[1], eyePoints[5]);
  const vertical2 = getDistance2D(eyePoints[2], eyePoints[4]);
  const horizontal = getDistance2D(eyePoints[0], eyePoints[3]);

  if (horizontal === 0) return 0.3;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * ดึงจุดดวงตาทั้งสองข้างและคำนวณ EAR เฉลี่ย
 */
export function getAverageEAR(landmarks: any): { leftEAR: number; rightEAR: number; avgEAR: number } {
  try {
    const positions = landmarks.positions || landmarks._positions;
    if (!positions || positions.length < 48) {
      return { leftEAR: 0.3, rightEAR: 0.3, avgEAR: 0.3 };
    }

    const leftEye = [
      positions[36],
      positions[37],
      positions[38],
      positions[39],
      positions[40],
      positions[41],
    ];
    const rightEye = [
      positions[42],
      positions[43],
      positions[44],
      positions[45],
      positions[46],
      positions[47],
    ];

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2.0;

    return { leftEAR, rightEAR, avgEAR };
  } catch {
    return { leftEAR: 0.3, rightEAR: 0.3, avgEAR: 0.3 };
  }
}

/**
 * ประเมินทิศทางการหันศีรษะ (Head Pose - Yaw Ratio)
 * ใช้อัตราส่วนตำแหน่งปลายจมูกเทียบกับขอบแก้มซ้าย-ขวา
 */
export function getHeadPoseYaw(landmarks: any): "FRONT" | "LEFT" | "RIGHT" {
  try {
    const positions = landmarks.positions || landmarks._positions;
    if (!positions || positions.length < 31) return "FRONT";

    const leftCheek = positions[0];   // ขอบแก้มซ้ายสุด
    const rightCheek = positions[16]; // ขอบแก้มขวาสุด
    const noseTip = positions[30];    // ปลายจมูก

    const totalWidth = rightCheek.x - leftCheek.x;
    if (totalWidth <= 0) return "FRONT";

    const noseRatio = (noseTip.x - leftCheek.x) / totalWidth;

    // หน้าตรงจะอยู่ระหว่าง 0.40 ถึง 0.60
    if (noseRatio < 0.38) return "LEFT";
    if (noseRatio > 0.62) return "RIGHT";
    return "FRONT";
  } catch {
    return "FRONT";
  }
}

/**
 * ตรวจสอบคุณภาพใบหน้า: ขนาด ระยะห่าง แสงสว่าง และคอนทราสต์
 * ป้องกันการถ่ายภาพจากระยะไกล หรือภาพจอมือถือที่มีแสงสะท้อนจ้า
 */
export function checkFaceQuality(
  ctx: CanvasRenderingContext2D | null,
  box: { x: number; y: number; width: number; height: number },
  videoWidth: number,
  videoHeight: number
): FaceQualityResult {
  const w = box.width;
  const h = box.height;

  // 1. ตรวจสอบขนาดใบหน้า & ระยะห่าง
  // เหมาะสมสำหรับวิดีโอทั่วไป (ประมาณ 130px ถึง 300px)
  let sizeStatus: "too_small" | "too_large" | "optimal" = "optimal";
  let distanceFeedback = "ระยะห่างเหมาะสม";

  if (w < 125 || h < 125) {
    sizeStatus = "too_small";
    distanceFeedback = "ขยับหน้าเข้ามาใกล้กล้องอีกนิด (0.5 - 1.2 ม.)";
  } else if (w > 320 || h > 320) {
    sizeStatus = "too_large";
    distanceFeedback = "ถอยห่างจากกล้องเล็กน้อย";
  }

  // 2. ตรวจสอบความสว่างและคอนทราสต์จากพิกเซลบนใบหน้า
  let luminance = 128;
  let contrast = 50;
  let luminanceStatus: "too_dark" | "too_bright" | "optimal" = "optimal";
  let lightingFeedback = "แสงสว่างพอดี";
  let contrastStatus: "low_contrast" | "optimal" = "optimal";

  if (ctx && w > 20 && h > 20) {
    try {
      // ตัดขอบเฉพาะพื้นที่ใบหน้าด้านใน (ลดการตรวจโดนฉากหลัง)
      const cropX = Math.max(0, Math.floor(box.x + w * 0.15));
      const cropY = Math.max(0, Math.floor(box.y + h * 0.15));
      const cropW = Math.min(videoWidth - cropX, Math.floor(w * 0.7));
      const cropH = Math.min(videoHeight - cropY, Math.floor(h * 0.7));

      if (cropW > 10 && cropH > 10) {
        const imgData = ctx.getImageData(cropX, cropY, cropW, cropH);
        const data = imgData.data;
        let sumLuminance = 0;
        let count = 0;

        // คำนวณความสว่างเฉลี่ย (สุ่มก้าวทีละ 4 พิกเซลเพื่อความเร็ว)
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sumLuminance += lum;
          count++;
        }

        if (count > 0) {
          luminance = sumLuminance / count;

          // คำนวณ Standard Deviation (Contrast)
          let varianceSum = 0;
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            varianceSum += Math.pow(lum - luminance, 2);
          }
          contrast = Math.sqrt(varianceSum / count);
        }
      }
    } catch {
      // Fallback
    }
  }

  // ประเมินผลแสงสว่าง
  if (luminance < 60) {
    luminanceStatus = "too_dark";
    lightingFeedback = "แสงน้อยเกินไป กรุณาเปิดไฟหรือไปยังจุดสว่าง";
  } else if (luminance > 220) {
    luminanceStatus = "too_bright";
    lightingFeedback = "แสงจ้าหรือย้อนแสงเกินไป";
  }

  // ประเมินคอนทราสต์ (ถ้าภาพแบนราบหรือเป็นจอมือถือสะท้อนแสงวาบ คอนทราสต์จะผิดปกติ)
  if (contrast < 18) {
    contrastStatus = "low_contrast";
  }

  const passed =
    sizeStatus === "optimal" &&
    luminanceStatus === "optimal" &&
    contrastStatus === "optimal";

  let overallFeedback = "คุณภาพใบหน้าสมบูรณ์";
  if (sizeStatus !== "optimal") overallFeedback = distanceFeedback;
  else if (luminanceStatus !== "optimal") overallFeedback = lightingFeedback;
  else if (contrastStatus !== "optimal") overallFeedback = "ภาพไม่คมชัดหรือมีแสงสะท้อน";

  return {
    passed,
    score: passed ? 100 : sizeStatus === "optimal" ? 70 : 40,
    faceSize: { width: Math.round(w), height: Math.round(h) },
    sizeStatus,
    distanceFeedback,
    luminance: Math.round(luminance),
    luminanceStatus,
    lightingFeedback,
    contrast: Math.round(contrast),
    contrastStatus,
    overallFeedback,
  };
}

/**
 * คำนวณ Euclidean Distance ระหว่าง 128-d Face Descriptors
 * ค่ายิ่งต่ำ = ยิ่งเหมือนกันมาก (0.00 = หน้าเดียวกัน)
 */
export function calculateEuclideanDistance(
  desc1: number[] | Float32Array,
  desc2: number[] | Float32Array
): number {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * คำนวณ % ความเหมือนจาก Distance
 */
export function distanceToSimilarity(distance: number): number {
  // distance 0.0 -> 100%, 0.40 -> ~60%, 0.60 -> ~40%, 1.0 -> 0%
  return Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
}
