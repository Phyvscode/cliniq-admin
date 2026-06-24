import {
  LayoutDashboard, TrendingUp, Building2,
  Stethoscope, Users, BedDouble, FlaskConical,
  Pill, CalendarClock, UserCog, FileBarChart2,
  ClipboardList, LogOut, Shield,
} from "lucide-react";

export type AdminPage =
  | "command-center" | "revenue" | "departments"
  | "doctors" | "patients" | "ipd" | "beds"
  | "pharmacy" | "lab" | "followups" | "staff" | "reports" | "settings";

interface NavItem { label: string; page: AdminPage; icon: React.ElementType; }

const SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "ANALYTICS",
    items: [
      { label: "Command Center", page: "command-center", icon: LayoutDashboard },
      { label: "Revenue",        page: "revenue",        icon: TrendingUp       },
      { label: "Departments",    page: "departments",    icon: Building2        },
    ],
  },
  {
    heading: "CLINICAL",
    items: [
      { label: "Doctors",         page: "doctors",  icon: Stethoscope  },
      { label: "Patients",        page: "patients", icon: Users        },
      { label: "IPD & Admissions",page: "ipd",      icon: ClipboardList },
      { label: "Bed Management",  page: "beds",     icon: BedDouble    },
    ],
  },
  {
    heading: "OPERATIONS",
    items: [
      { label: "Pharmacy",   page: "pharmacy",  icon: Pill          },
      { label: "Laboratory", page: "lab",       icon: FlaskConical  },
      { label: "Follow-ups", page: "followups", icon: CalendarClock },
      { label: "Staff",      page: "staff",     icon: UserCog       },
      { label: "Reports",    page: "reports",   icon: FileBarChart2 },
      { label: "Settings",   page: "settings",  icon: Shield        },
    ],
  },
];

interface Props {
  active: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
}

export default function AdminSidebar({ active, onNavigate, onLogout, userName = "Admin", userRole = "Executive Owner" }: Props) {
  const initials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen bg-[#0f1623] border-r border-white/5">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-base">ClinIQ</span>
          <span className="text-[10px] font-semibold bg-white/10 text-white/60 px-1.5 py-0.5 rounded">ADMIN</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map(section => (
          <div key={section.heading}>
            <p className="text-[10px] font-semibold tracking-widest text-white/30 px-2 mb-1.5">
              {section.heading}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = active === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => onNavigate(item.page)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-[11px] text-white/40 truncate">{userRole}</p>
          </div>
          <button onClick={onLogout} className="text-white/30 hover:text-white/60 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
