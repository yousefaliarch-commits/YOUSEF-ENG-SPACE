// The registry names its icons; this map turns each name into a lucide component (explicit named imports only, so the
// bundle carries just these). A test checks every registry icon is here.
import {
  AirVent, BadgeDollarSign, Cable, Calculator, ClipboardCheck, Cylinder, Droplets, FileCheck, HardHat, Map as MapIcon, Megaphone,
  MessageSquare, NotebookPen, Percent, Repeat, Route, Ruler, Scale, ShieldCheck, Spline, Timer, Waves,
} from "lucide-react";

export const TOOL_ICONS: Record<string, any> = {
  AirVent, BadgeDollarSign, Cable, Calculator, ClipboardCheck, Cylinder, Droplets, FileCheck, HardHat, Map: MapIcon, Megaphone,
  MessageSquare, NotebookPen, Percent, Repeat, Route, Ruler, Scale, ShieldCheck, Spline, Timer, Waves,
};
