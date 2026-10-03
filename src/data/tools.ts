import {
  BadgeDollarSign, Blocks, Calculator, Cylinder, FileCheck, Ruler, Spline, Map as MapIcon, MessageSquare, Percent, Route, Scale, Timer
} from "lucide-react";

// =====================================================================
//  Tools — Egypt
// =====================================================================
export const TOOLS = [
  // site and technical office (Feature 6) — group "site"
  { id: "concrete", group: "site", name: "حصر الخرسانة", desc: "الحجم والأسمنت والرمل والزلط", icon: Cylinder },
  { id: "rebar", group: "site", name: "أوزان الحديد", desc: "الوزن وعدد أسياخ الـ 12 م", icon: Spline },
  { id: "masonry", group: "site", name: "حصر المباني", desc: "عدد الطوب والبلوك والمونة", icon: Blocks },
  { id: "units", group: "site", name: "تحويل الوحدات", desc: "هندسية، وفدان وقيراط وسهم", icon: Ruler },
  { id: "offer", name: "تقييم عرض عمل", desc: "مكانه من السوق بالصافي ورقمك المضاد", icon: BadgeDollarSign },
  { id: "net", name: "الصافي والإجمالي", desc: "حوّل بين الصافي والإجمالي", icon: Calculator },
  { id: "compare", name: "مقارن العروض", desc: "عرضان بالقيمة الحقيقية للساعة", icon: Scale },
  { id: "script", name: "سكريبت التفاوض", desc: "كلام جاهز بالأرقام", icon: MessageSquare },
  { id: "raise", name: "توقيت الزيادة", desc: "اطلب الآن أم بعد قليل؟", icon: Timer },
  { id: "path", name: "خريطة المسار", desc: "خطوتك القادمة ورقمها", icon: Route },
  { id: "contract", name: "فاحص العقد", desc: "قبل ما تمضي", icon: FileCheck },
  { id: "move", name: "تكلفة الانتقال", desc: "القاهرة ↔ العاصمة ↔ العلمين", icon: MapIcon },
  { id: "inflation", name: "الزيادة والتضخم", desc: "سجّل راتبك وقارنه بالتضخم الرسمي والسوق", icon: Percent },
];
