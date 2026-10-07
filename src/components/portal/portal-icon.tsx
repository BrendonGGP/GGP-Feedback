// Ícones do portal: Hugeicons, estilo "stroke rounded" (mesma família do GGPost).
//
// Ponto único de onde toda tela importa ícone: o nome que a tela escreve
// continua o mesmo, e trocar de família é mexer só aqui. Tudo é contorno; o
// item ativo se marca engrossando o traço (`ativo`).
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  Alert02Icon,
  Analytics01Icon,
  ArrowLeft01Icon,
  ArrowRight02Icon,
  Building03Icon,
  Calendar03Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  Download04Icon,
  Edit02Icon,
  InformationCircleIcon,
  LockPasswordIcon,
  Logout01Icon,
  Mail01Icon,
  Megaphone01Icon,
  Menu01Icon,
  Message01Icon,
  Moon02Icon,
  Notification01Icon,
  Search01Icon,
  SecurityCheckIcon,
  StarIcon,
  Sun03Icon,
  TaskDaily01Icon,
  UserGroupIcon,
  UserIcon,
  UserMultiple02Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import type { SVGProps } from "react";

const ICONES = {
  add: Add01Icon,
  admin: SecurityCheckIcon,
  alert: Alert02Icon,
  analytics: Analytics01Icon,
  arrow: ArrowRight02Icon,
  back: ArrowLeft01Icon,
  bell: Notification01Icon,
  calendar: Calendar03Icon,
  check: CheckmarkCircle02Icon,
  clock: Clock01Icon,
  close: Cancel01Icon,
  cycle: TaskDaily01Icon,
  dashboard: DashboardSquare01Icon,
  delete: Delete02Icon,
  download: Download04Icon,
  edit: Edit02Icon,
  eye: ViewIcon,
  eyeOff: ViewOffIcon,
  feedback: Message01Icon,
  info: InformationCircleIcon,
  lock: LockPasswordIcon,
  logout: Logout01Icon,
  mail: Mail01Icon,
  megaphone: Megaphone01Icon,
  menu: Menu01Icon,
  moon: Moon02Icon,
  organization: Building03Icon,
  people: UserMultiple02Icon,
  search: Search01Icon,
  star: StarIcon,
  sun: Sun03Icon,
  team: UserGroupIcon,
  user: UserIcon,
} satisfies Record<string, IconSvgElement>;

export type PortalIconName = keyof typeof ICONES;

type PortalIconProps = Omit<SVGProps<SVGSVGElement>, "children" | "ref" | "strokeWidth"> &
  Readonly<{
    name: PortalIconName;
    /** Tamanho em px (o CSS de quem usa pode sobrescrever). */
    size?: number;
    /** Item ativo: traço mais grosso, como na lateral do GGPost. */
    ativo?: boolean;
  }>;

export function PortalIcon({ name, size = 20, ativo = false, ...props }: PortalIconProps) {
  return (
    <HugeiconsIcon
      icon={ICONES[name]}
      size={size}
      strokeWidth={ativo ? 2.2 : 1.6}
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}
