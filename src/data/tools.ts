import {
  BadgeDollarSign, Calculator, FileCheck, Map as MapIcon, MessageSquare, Percent, Route, Scale, Timer
} from "lucide-react";

// =====================================================================
//  Tools — Egypt
// =====================================================================
export const TOOLS = [
  { id: "offer", name: "تقييم عرض عمل", desc: "صافيه ومكانه من السوق ورقمك المضاد", icon: BadgeDollarSign },
  { id: "net", name: "حاسبة الصافي", desc: "الصافي، والعكس: كم أطلب لأقبض؟", icon: Calculator },
  { id: "compare", name: "مقارن العروض", desc: "عرضان بالقيمة الحقيقية للساعة", icon: Scale },
  { id: "script", name: "سكريبت التفاوض", desc: "كلام جاهز بالأرقام", icon: MessageSquare },
  { id: "raise", name: "توقيت الزيادة", desc: "اطلب الآن أم بعد قليل؟", icon: Timer },
  { id: "path", name: "خريطة المسار", desc: "خطوتك القادمة ورقمها", icon: Route },
  { id: "contract", name: "فاحص العقد", desc: "قبل ما تمضي", icon: FileCheck },
  { id: "move", name: "تكلفة الانتقال", desc: "القاهرة ↔ العاصمة ↔ العلمين", icon: MapIcon },
  { id: "inflation", name: "العلاوة والتضخم", desc: "هل زيادتك زيادة فعلًا؟", icon: Percent },
];
