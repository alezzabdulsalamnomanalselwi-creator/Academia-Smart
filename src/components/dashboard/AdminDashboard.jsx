import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  FaBuilding,
  FaBook,
  FaBriefcase,
  FaCheck,
  FaChartBar,
  FaEdit,
  FaGraduationCap,
  FaLayerGroup,
  FaPause,
  FaPlay,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUserShield,
  FaUsers,
  FaSignOutAlt,
  FaHistory,
  FaLock,
  FaFilePdf,
  FaSitemap,
} from "react-icons/fa";
import Header from "./Header";
import Toast from "../shared/Toast";
import ConfirmDialog from "../shared/ConfirmDialog";
import {
  createLimitedAdminAccount,
  processRecruiterRequest,
  updateUserSecurity,
} from "../../services/apiClient";
import { useLanguage } from "../../context/LanguageContext";

const tabDefinitions = [
  ["overview", FaChartBar],
  ["requests", FaUserShield],
  ["users", FaUsers],
  ["reports", FaSitemap],
  ["universities", FaBuilding],
  ["colleges", FaGraduationCap],
  ["departments", FaLayerGroup],
  ["subjects", FaBook],
  ["audit", FaHistory],
];
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const copy =
    language === "ar"
      ? {
          dashboard: "لوحة إدارة النظام",
          control: "مركز التحكم الأكاديمي",
          overview: "نظرة عامة",
          requests: "طلبات الانضمام",
          users: "الحسابات والصلاحيات",
          reports: "التقرير الأكاديمي",
          universities: "الجامعات",
          colleges: "الكليات",
          departments: "الأقسام",
          subjects: "المواد",
          audit: "سجل العمليات",
          totalUsers: "إجمالي المستخدمين",
          lecturers: "المحاضرون",
          recruiters: "مسؤولو التوظيف",
          pending: "طلبات انضمام معلقة",
          administration: "الإدارة",
          recent: "النشاط الأخير",
          recentHelp: "آخر العمليات الإدارية المتاحة",
          summary: "ملخص سريع",
          system: "حالة النظام",
          activeAccounts: "الحسابات النشطة",
          suspendedAccounts: "الحسابات الموقوفة",
          blockedAccounts: "الحسابات المحظورة",
          fileApi: "خدمة الملفات المحلية",
          working: "تعمل",
          unavailable: "غير متاحة",
          firebase: "Firebase: متصل",
          joinHint:
            "إدارة المستخدمين والبيانات الأكاديمية ومتابعة صحة المنصة من مساحة موحدة",
        }
      : {
          dashboard: "System Administration Dashboard",
          control: "Academic Control Center",
          overview: "Overview",
          requests: "Join Requests",
          users: "Accounts & Permissions",
          reports: "Academic Report",
          universities: "Universities",
          colleges: "Colleges",
          departments: "Departments",
          subjects: "Subjects",
          audit: "Audit Log",
          totalUsers: "Total Users",
          lecturers: "Lecturers",
          recruiters: "Recruiters",
          pending: "Pending Join Requests",
          administration: "Administration",
          recent: "Recent Activity",
          recentHelp: "Latest available administrative activity",
          summary: "Quick Summary",
          system: "System Status",
          activeAccounts: "Active Accounts",
          suspendedAccounts: "Suspended Accounts",
          blockedAccounts: "Blocked Accounts",
          fileApi: "Local File API",
          working: "Available",
          unavailable: "Unavailable",
          firebase: "Firebase: Connected",
          joinHint:
            "Manage users, academic data, and platform health from one workspace",
        };
  const tabs = tabDefinitions.map(([key, Icon]) => [key, copy[key], Icon]);
  const tr = (ar, en) => language === 'ar' ? ar : en;
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [logs, setLogs] = useState([]);
  const [fileHealth, setFileHealth] = useState({ loading: true, ok: false });
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState("");
  const [reportUniversityId, setReportUniversityId] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [newName, setNewName] = useState("");
  const [parentId, setParentId] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState("");
  const [adminForm, setAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    permissions: [],
  });
  const [editingAcademic, setEditingAcademic] = useState(null);
  const [editAcademicName, setEditAcademicName] = useState("");
  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let stopProfile = null;
    const stopAuth = onAuthStateChanged(auth, (u) => {
      if (stopProfile) stopProfile();
      if (!u) {
        navigate("/login");
        return;
      }
      stopProfile = onSnapshot(
        doc(db, "users", u.uid),
        (s) => {
          if (
            !s.exists() ||
            s.data().role !== "admin" ||
            ["blocked", "suspended"].includes(s.data().accountStatus)
          ) {
            navigate("/unauthorized");
            return;
          }
          setCurrentAdmin({ id: u.uid, ...s.data() });
          setLoading(false);
        },
        () => navigate("/unauthorized"),
      );
    });
    return () => {
      stopAuth();
      if (stopProfile) stopProfile();
    };
  }, [navigate]);
  useEffect(() => {
    if (loading || !currentAdmin) return;
    const unsubs = [];
    const watch = (name, setter, ord = false) => {
      try {
        const ref = ord
          ? query(collection(db, name), orderBy("createdAt", "desc"))
          : collection(db, name);
        unsubs.push(
          onSnapshot(
            ref,
            (s) => setter(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (e) => console.warn(name, e?.code || "READ_DENIED"),
          ),
        );
      } catch (e) {
        console.warn(name, e?.code || "READ_DENIED");
      }
    };
    const legacy =
      currentAdmin.role === "admin" &&
      !currentAdmin.adminLevel &&
      !Array.isArray(currentAdmin.permissions);
    const superUser =
      currentAdmin.adminLevel === "super" ||
      currentAdmin.isSuperAdmin === true ||
      legacy;
    const can = (permission) =>
      superUser ||
      (currentAdmin.permissions || []).includes("*") ||
      (currentAdmin.permissions || []).includes(permission);
    if (can("users.manage") || can("audit.view")) watch("users", setUsers);
    if (can("audit.view")) watch("adminLogs", setLogs, true);
    if (can("requests.manage")) watch("recruiterRequests", setRequests);
    watch("universities", setUniversities);
    watch("colleges", setColleges);
    watch("departments", setDepartments);
    watch("subjects", setSubjects);
    return () => unsubs.forEach((u) => u());
  }, [loading, currentAdmin]);
  useEffect(() => {
    if (loading) return;
    const base = (
      process.env.REACT_APP_FILE_API_URL || "http://localhost:5050"
    ).replace(/\/$/, "");
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 3500);
    fetch(`${base}/api/health`, { signal: c.signal })
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((d) =>
        setFileHealth({ loading: false, ok: d.ok === true, data: d }),
      )
      .catch((e) =>
        setFileHealth({ loading: false, ok: false, error: e.message }),
      )
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [loading]);

  const pending = requests.filter((r) => r.status === "pending");
  const integrityIssues = [
    ...colleges
      .filter(
        (x) =>
          x.universityId && !universities.some((u) => u.id === x.universityId),
      )
      .map((x) => `${tr("كلية بدون جامعة", "College without university")}: ${x.name}`),
    ...departments
      .filter((x) => x.collegeId && !colleges.some((c) => c.id === x.collegeId))
      .map((x) => `${tr("قسم بدون كلية", "Department without college")}: ${x.name}`),
    ...subjects
      .filter(
        (x) =>
          x.departmentId && !departments.some((d) => d.id === x.departmentId),
      )
      .map((x) => `${tr("مادة بدون قسم", "Subject without department")}: ${x.name}`),
  ];
  const stats = [
    [copy.totalUsers, users.length, FaUsers],
    [
      copy.lecturers,
      users.filter((x) => x.role === "lecturer").length,
      FaGraduationCap,
    ],
    [
      copy.recruiters,
      users.filter((x) => x.role === "recruiter").length,
      FaBriefcase,
    ],
    [copy.pending, pending.length, FaUserShield],
    [copy.universities, universities.length, FaBuilding],
    [copy.subjects, subjects.length, FaBook],
  ];
  const roleMetrics = [
    [
      copy.lecturers,
      users.filter((x) => x.role === "lecturer").length,
      "from-blue-600 to-cyan-500",
    ],
    [
      copy.recruiters,
      users.filter((x) => x.role === "recruiter").length,
      "from-teal-600 to-emerald-500",
    ],
    [
      copy.administration,
      users.filter((x) => x.role === "admin").length,
      "from-indigo-600 to-violet-500",
    ],
  ];
  const filtered = useMemo(
    () =>
      users.filter((u) =>
        `${u.firstName || ""} ${u.lastName || ""} ${u.email || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [users, search],
  );

  const ADMIN_PERMISSIONS = [
    ["users.manage", tr("إدارة الحسابات", "Manage accounts")],
    ["requests.manage", tr("طلبات الانضمام", "Join requests")],
    ["academic.manage", tr("إدارة البيانات الأكاديمية", "Manage academic data")],
    ["jobs.view", tr("عرض الوظائف والطلبات", "View jobs and applications")],
    ["reports.view", tr("التقارير والإحصائيات", "Reports and analytics")],
    ["audit.view", tr("عرض سجل العمليات", "View audit log")],
  ];
  const isLegacyAdmin =
    currentAdmin?.role === "admin" &&
    !currentAdmin?.adminLevel &&
    !Array.isArray(currentAdmin?.permissions);
  const isSuperAdmin =
    currentAdmin?.adminLevel === "super" ||
    currentAdmin?.isSuperAdmin === true ||
    isLegacyAdmin;
  const adminCan = (perm) =>
    isSuperAdmin ||
    (currentAdmin?.permissions || []).includes("*") ||
    (currentAdmin?.permissions || []).includes(perm);
  const tabPermission = {
    reports: "reports.view",
    requests: "requests.manage",
    users: "users.manage",
    universities: "academic.manage",
    colleges: "academic.manage",
    departments: "academic.manage",
    subjects: "academic.manage",
    audit: "audit.view",
  };
  const visibleTabs = tabs.filter(
    ([k]) => !tabPermission[k] || adminCan(tabPermission[k]),
  );
  const userIsSuper = (user) =>
    user?.role === "admin" &&
    (user?.adminLevel === "super" ||
      user?.isSuperAdmin === true ||
      (user?.adminLevel === undefined && !Array.isArray(user?.permissions)));
  async function setAdminPermission(user, perm, checked) {
    if (!isSuperAdmin)
      return notify(tr("هذه العملية متاحة للمدير الرئيسي فقط", "This action is available to the Super Admin only"), "error");
    if (user.id === auth.currentUser?.uid || userIsSuper(user))
      return notify(
        tr("حساب المدير الرئيسي محمي ولا يمكن تعديل صلاحياته هنا", "The Super Admin account is protected and its permissions cannot be changed here"),
        "error",
      );
    const current = Array.isArray(user.permissions) ? user.permissions : [];
    const next = checked
      ? Array.from(new Set([...current, perm]))
      : current.filter((x) => x !== perm);
    await updateUser(
      user,
      { permissions: next, adminLevel: user.adminLevel || "limited" },
      tr("تم تحديث صلاحيات المدير", "Administrator permissions updated"),
    );
  }

  async function audit(action, target, details = "") {
    try {
      await addDoc(collection(db, "adminLogs"), {
        action,
        target,
        details,
        adminId: auth.currentUser?.uid || "",
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn(e);
    }
  }
  async function updateUser(u, patch, msg) {
    try {
      const securityKeys = [
        "role",
        "permissions",
        "adminLevel",
        "accountStatus",
      ];
      if (Object.keys(patch).some((k) => securityKeys.includes(k)))
        await updateUserSecurity(u.id, patch);
      else {
        await updateDoc(doc(db, "users", u.id), patch);
        await audit("update_user", u.id, JSON.stringify(patch));
      }
      notify(msg);
    } catch (e) {
      notify(tr("تعذر تحديث الحساب: ", "Unable to update account: ") + e.message, "error");
    }
  }
  async function processRequest(r, status) {
    if (processingRequestId) return;
    setProcessingRequestId(r.id);
    try {
      const action = status === "approved" ? "approve" : "reject";
      const result = await processRecruiterRequest(r.id, action);
      notify(
        status === "approved"
          ? result.duplicate
            ? tr("الحساب مفعّل مسبقًا وتم التحقق من سلامته", "The account was already active and was verified")
            : tr("تم إنشاء وتفعيل حساب مسؤول التوظيف بنجاح", "Recruiter account created and activated successfully")
          : result.duplicate
            ? tr("الطلب مرفوض مسبقًا", "The request was already rejected")
            : tr("تم رفض الطلب دون تفعيل حساب مسؤول توظيف", "The request was rejected without activating a recruiter account"),
      );
    } catch (e) {
      notify(e.message || tr("تعذر معالجة الطلب بأمان", "Unable to process the request safely"), "error");
    } finally {
      setProcessingRequestId("");
    }
  }
  const config = {
    universities: { title: "جامعة", collection: "universities" },
    colleges: { title: "كلية", collection: "colleges" },
    departments: { title: "قسم", collection: "departments" },
    subjects: { title: "مادة", collection: "subjects" },
  };
  const norm = (v) => (v || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const makeSubjectCode = () => {
    const dep = departments.find((x) => x.id === parentId);
    const dn = (dep?.name || "").toLowerCase();
    const words = (dep?.name || "SUB")
      .replace(/[^A-Za-z0-9\u0600-\u06FF ]/g, " ")
      .trim()
      .split(/\s+/);
    let prefix = words
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    if (
      dn.includes("information technology") ||
      dn.includes("تقنية المعلومات") ||
      dn.includes("تكنولوجيا المعلومات")
    )
      prefix = "IT";
    else if (
      (dn.includes("computer science") || dn.includes("علوم الحاسوب")) &&
      (dn.includes("artificial intelligence") ||
        dn.includes("الذكاء الاصطناعي"))
    )
      prefix = "CSAI";
    else if (
      dn.includes("artificial intelligence") ||
      dn.includes("الذكاء الاصطناعي")
    )
      prefix = "AI";
    else if (dn.includes("computer science") || dn.includes("علوم الحاسوب"))
      prefix = "CS";
    if (prefix.length < 2)
      prefix = (dep?.name || "SUB").slice(0, 3).toUpperCase();
    prefix = prefix.replace(/[^A-Z]/g, "") || "SUB";
    const nums = subjects
      .filter(
        (x) =>
          x.departmentId === parentId &&
          String(x.code || "")
            .toUpperCase()
            .startsWith(prefix),
      )
      .map((x) => parseInt(String(x.code).replace(/\D/g, ""), 10))
      .filter(Number.isFinite);
    return `${prefix}${nums.length ? Math.max(...nums) + 1 : 101}`;
  };
  async function addAcademic() {
    const c = config[tab];
    const cleanName = newName.trim().replace(/\s+/g, " ");
    if (!cleanName) return notify(tr(`أدخل اسم ${c.title}`, `Enter a ${copy[tab]} name`), "error");
    if (tab !== "universities" && !parentId)
      return notify(tr("اختر الجهة التابعة أولاً", "Select the parent entity first"), "error");
    const items = { universities, colleges, departments, subjects }[tab] || [];
    const duplicate = items.some(
      (x) =>
        norm(x.name) === norm(cleanName) &&
        (tab === "universities" ||
          (tab === "colleges" && x.universityId === parentId) ||
          (tab === "departments" && x.collegeId === parentId) ||
          (tab === "subjects" && x.departmentId === parentId)),
    );
    if (duplicate)
      return notify(
        `${c.title === "كلية" ? "هذه الكلية" : c.title === "مادة" ? "هذه المادة" : c.title === "جامعة" ? "هذه الجامعة" : "هذا القسم"} موجود${c.title === "كلية" || c.title === "مادة" || c.title === "جامعة" ? "ة" : ""} مسبقاً`,
        "error",
      );
    try {
      const data = {
        name: cleanName,
        active: true,
        createdAt: serverTimestamp(),
      };
      if (tab === "colleges") data.universityId = parentId;
      if (tab === "departments") data.collegeId = parentId;
      if (tab === "subjects") {
        data.departmentId = parentId;
        data.code = makeSubjectCode();
      }
      await addDoc(collection(db, c.collection), data);
      await audit("add_" + tab, cleanName, JSON.stringify(data));
      setNewName("");
      notify(tr(`تمت إضافة ${c.title} بنجاح`, `${copy[tab]} added successfully`));
    } catch (e) {
      notify(tr("تعذرت الإضافة: ", "Unable to add: ") + e.message, "error");
    }
  }
  async function hasRelations(item) {
    const checks = [];
    if (tab === "universities") {
      checks.push(["colleges", "universityId"]);
      checks.push(["positions", "universityId"]);
    }
    if (tab === "colleges") {
      checks.push(["departments", "collegeId"]);
      checks.push(["positions", "collegeId"]);
    }
    if (tab === "departments") {
      checks.push(["subjects", "departmentId"]);
      checks.push(["positions", "departmentId"]);
    }
    if (tab === "subjects") {
      checks.push(["positions", "subjectId"]);
    }
    for (const [col, field] of checks) {
      const snap = await getDocs(
        query(collection(db, col), where(field, "==", item.id)),
      );
      if (!snap.empty) return true;
    }
    return false;
  }
  async function doRemoveAcademic(item) {
    setConfirmState(null);
    try {
      if (await hasRelations(item))
        return notify(
          tr(`لا يمكن حذف ${config[tab].title} لأنه مرتبط ببيانات أخرى. أوقفه بدلاً من الحذف.`, `This ${copy[tab]} cannot be deleted because linked records exist. Disable it instead.`),
          "error",
        );
      await deleteDoc(doc(db, config[tab].collection, item.id));
      await audit("delete_" + tab, item.id, item.name || "");
      notify(tr("تم الحذف", "Deleted successfully"));
    } catch (e) {
      notify(tr("تعذر الحذف: ", "Unable to delete: ") + e.message, "error");
    }
  }
  function removeAcademic(item) {
    setConfirmState({
      title: tr("تأكيد الحذف", "Confirm deletion"),
      message: tr(`هل أنت متأكد من حذف ${item.name}؟ لا يمكن التراجع عن هذه العملية.`, `Are you sure you want to delete ${item.name}? This action cannot be undone.`),
      danger: true,
      confirmText: tr("حذف", "Delete"),
      onConfirm: () => doRemoveAcademic(item),
    });
  }
  async function toggleAcademic(item) {
    try {
      await updateDoc(doc(db, config[tab].collection, item.id), {
        active: item.active === false ? true : false,
        updatedAt: serverTimestamp(),
      });
      await audit("toggle_" + tab, item.id, String(item.active === false));
      notify(tr("تم تحديث الحالة", "Status updated"));
    } catch (e) {
      notify(tr("تعذر التحديث", "Unable to update"), "error");
    }
  }
  function editAcademic(item) {
    setEditingAcademic(item);
    setEditAcademicName(item.name || "");
  }
  async function saveAcademicEdit() {
    const item = editingAcademic;
    const name = editAcademicName.trim().replace(/\s+/g, " ");
    if (!item || !name) return;
    try {
      const items =
        { universities, colleges, departments, subjects }[tab] || [];
      const parentMatch = (x) =>
        tab === "universities" ||
        (tab === "colleges" && x.universityId === item.universityId) ||
        (tab === "departments" && x.collegeId === item.collegeId) ||
        (tab === "subjects" && x.departmentId === item.departmentId);
      if (
        items.some(
          (x) =>
            x.id !== item.id && parentMatch(x) && norm(x.name) === norm(name),
        )
      )
        return notify(tr("الاسم مستخدم مسبقًا", "This name already exists"), "error");
      await updateDoc(doc(db, config[tab].collection, item.id), {
        name,
        updatedAt: serverTimestamp(),
      });
      await audit("edit_" + tab, item.id, name);
      setEditingAcademic(null);
      notify(tr("تم تعديل البيانات بنجاح", "Changes saved successfully"));
    } catch (e) {
      notify(tr("تعذر التعديل", "Unable to save changes"), "error");
    }
  }
  async function doLogout() {
    setConfirmState(null);
    await signOut(auth);
    navigate("/login");
  }
  function logout() {
    setConfirmState({
      title: tr("تأكيد تسجيل الخروج", "Confirm log out"),
      message: tr("هل أنت متأكد من رغبتك في تسجيل الخروج؟", "Do you want to log out?"),
      danger: true,
      confirmText: tr("تسجيل الخروج", "Log out"),
      onConfirm: doLogout,
    });
  }
  async function saveUserEdit() {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        firstName: (editingUser.firstName || "").trim(),
        lastName: (editingUser.lastName || "").trim(),
        phone: (editingUser.phone || "").trim(),
        university: editingUser.university || "",
        department: editingUser.department || "",
        updatedAt: serverTimestamp(),
      });
      await audit("edit_user_profile", editingUser.id);
      notify(tr("تم تحديث بيانات المستخدم بنجاح", "User details updated successfully"));
      setEditingUser(null);
    } catch (e) {
      notify(tr("تعذر تعديل المستخدم: ", "Unable to update user: ") + e.message, "error");
    }
  }
  async function createLimitedAdmin() {
    if (!isSuperAdmin)
      return notify(tr("إنشاء مدير جديد متاح للمدير الأعلى فقط.", "Only the Super Admin can create a new administrator."), "error");
    const f = adminForm;
    if (!f.firstName.trim() || !f.email.trim() || f.password.length < 6)
      return notify(tr("أدخل الاسم والبريد وكلمة مرور لا تقل عن 6 أحرف.", "Enter a name, email, and a password of at least 6 characters."), "error");
    setCreatingAdmin(true);
    try {
      await createLimitedAdminAccount({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        password: f.password,
        permissions: f.permissions,
      });
      setAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        permissions: [],
      });
      setShowCreateAdmin(false);
      notify(tr("تم إنشاء حساب مدير محدود الصلاحيات بنجاح.", "Limited administrator account created successfully."));
    } catch (e) {
      notify(tr("تعذر إنشاء المدير: ", "Unable to create administrator: ") + e.message, "error");
    } finally {
      setCreatingAdmin(false);
    }
  }

  const actionLabels = {
    update_user: tr("تعديل حساب مستخدم", "Update user account"),
    update_user_security: tr("تحديث إعدادات أمان المستخدم", "Update user security"),
    edit_user_profile: tr("تعديل بيانات مستخدم", "Edit user profile"),
    create_limited_admin: tr("إنشاء مدير محدود", "Create limited admin"),
    add_universities: tr("إضافة جامعة", "Add university"),
    edit_universities: tr("تعديل جامعة", "Edit university"),
    delete_universities: tr("حذف جامعة", "Delete university"),
    toggle_universities: tr("تغيير حالة جامعة", "Change university status"),
    add_colleges: tr("إضافة كلية", "Add college"),
    edit_colleges: tr("تعديل كلية", "Edit college"),
    delete_colleges: tr("حذف كلية", "Delete college"),
    toggle_colleges: tr("تغيير حالة كلية", "Change college status"),
    add_departments: tr("إضافة قسم", "Add department"),
    edit_departments: tr("تعديل قسم", "Edit department"),
    delete_departments: tr("حذف قسم", "Delete department"),
    toggle_departments: tr("تغيير حالة قسم", "Change department status"),
    add_subjects: tr("إضافة مادة", "Add subject"),
    edit_subjects: tr("تعديل مادة", "Edit subject"),
    delete_subjects: tr("حذف مادة", "Delete subject"),
    toggle_subjects: tr("تغيير حالة مادة", "Change subject status"),
    approve_recruiter_request: tr("قبول طلب انضمام مسؤول توظيف", "Approve recruiter join request"),
    approved_recruiter_request: tr("قبول طلب مسؤول توظيف", "Recruiter request approved"),
    reject_recruiter_request: tr("رفض طلب انضمام مسؤول توظيف", "Reject recruiter join request"),
    rejected_recruiter_request: tr("رفض طلب مسؤول توظيف", "Recruiter request rejected"),
  };
  const adminName = (id) => {
    const u = users.find((x) => x.id === id);
    return u
      ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || id
      : id || "-";
  };
  const cleanDetails = (v) => {
    if (!v) return "-";
    try {
      const o = JSON.parse(v);
      return Object.entries(o)
        .map(
          ([k, val]) =>
            `${k}: ${Array.isArray(val) ? val.join("، ") : String(val)}`,
        )
        .join(" | ");
    } catch {
      return String(v);
    }
  };
  const filteredLogs = logs.filter((l) =>
    `${actionLabels[l.action] || l.action || ""} ${l.target || ""} ${adminName(l.adminId)} ${cleanDetails(l.details)}`
      .toLowerCase()
      .includes(auditSearch.toLowerCase()),
  );
  const auditPages = Math.max(1, Math.ceil(filteredLogs.length / 25));
  const reportUniversity = universities.find(
    (u) => u.id === reportUniversityId,
  );
  const reportColleges = colleges.filter(
    (c) => c.universityId === reportUniversityId,
  );
  const reportDepartments = departments.filter((d) =>
    reportColleges.some((c) => c.id === d.collegeId),
  );
  const reportSubjects = subjects.filter((x) =>
    reportDepartments.some((d) => d.id === x.departmentId),
  );
  // eslint-disable-next-line no-useless-escape
  function printAcademicReport() {
    if (!reportUniversity) return notify(tr("اختر الجامعة أولاً", "Select a university first"), "error");
    const pc = language === 'ar' ? { dir:'rtl', locale:'ar-YE', title:'التقرير الأكاديمي', detailed:'التقرير التفصيلي للهيكل الأكاديمي', university:'الجامعة:', issued:'أصدره:', date:'التاريخ:', colleges:'الكليات', departments:'الأقسام', subjects:'المواد', college:'كلية', department:'قسم', code:'الكود', status:'الحالة', active:'نشطة', inactive:'موقوفة', noSubjects:'لا توجد مواد', noDepartments:'لا توجد أقسام.', noColleges:'لا توجد كليات مرتبطة بهذه الجامعة.', footer:'جامعة ← كلية ← قسم ← مادة — تقرير منشأ إلكترونيًا من Academia Smart. اختر «حفظ كملف PDF» من نافذة الطباعة.' } : { dir:'ltr', locale:'en-US', title:'Academic Report', detailed:'Detailed Academic Hierarchy Report', university:'University:', issued:'Issued by:', date:'Date:', colleges:'Colleges', departments:'Departments', subjects:'Subjects', college:'College', department:'Department', code:'Code', status:'Status', active:'Active', inactive:'Inactive', noSubjects:'No subjects available', noDepartments:'No departments available.', noColleges:'No colleges are linked to this university.', footer:'University → College → Department → Subject — electronically generated by Academia Smart. Choose “Save as PDF” in the print dialog.' };
    const esc = (v) =>
      String(v ?? "-").replace(
        /[&<>"]/g,
        (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
      );
    const blocks = reportColleges
      .map((c) => {
        const ds = reportDepartments.filter((d) => d.collegeId === c.id);
        return `<section><h2>${pc.college}: ${esc(c.name)} <small>(${c.active === false ? pc.inactive : pc.active})</small></h2>${
          ds.length
            ? ds
                .map(
                  (d) =>
                    `<div class="dep"><h3>${pc.department}: ${esc(d.name)} <small>(${d.active === false ? pc.inactive : pc.active})</small></h3><table><thead><tr><th>#</th><th>${pc.subjects}</th><th>${pc.code}</th><th>${pc.status}</th></tr></thead><tbody>${
                      reportSubjects
                        .filter((x) => x.departmentId === d.id)
                        .map(
                          (x, i) =>
                            `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td>${esc(x.code)}</td><td>${x.active === false ? pc.inactive : pc.active}</td></tr>`,
                        )
                        .join("") ||
                      `<tr><td colspan="4">${pc.noSubjects}</td></tr>`
                    }</tbody></table></div>`,
                )
                .join("")
            : `<p>${pc.noDepartments}</p>`
        }</section>`;
      })
      .join("");
    const html = `<!doctype html><html dir="${pc.dir}"><head><meta charset="utf-8"><title>${pc.title} - ${esc(reportUniversity.name)}</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:25px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0878aa;padding-bottom:14px}.brand{display:flex;align-items:center;gap:12px}.brand img{width:65px}h1{margin:0;font-size:22px}.meta{font-size:11px;line-height:1.8}.summary{display:flex;gap:10px;margin:16px 0}.summary b{font-size:18px}.summary div{border:1px solid #dbe4ee;border-radius:10px;padding:9px 14px}section{border:1px solid #dbe4ee;border-radius:12px;padding:12px;margin:12px 0;break-inside:avoid}h2{font-size:17px;margin:0 0 10px}.dep{margin:10px 15px;border-inline-start:4px solid #0878aa;padding-inline-start:12px}h3{font-size:14px}small{font-weight:normal;color:#64748b}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #dbe4ee;padding:6px;text-align:start}th{background:#eef7fb}footer{margin-top:15px;border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#64748b}@page{size:A4 portrait;margin:10mm}</style></head><body><header><div class="brand"><img src="${window.location.origin}/logo.png"><div><h1>Academia Smart</h1><b>${pc.detailed}</b></div></div><div class="meta"><b>${pc.university}</b> ${esc(reportUniversity.name)}<br><b>${pc.issued}</b> ${esc(adminName(auth.currentUser?.uid))}<br><b>${pc.date}</b> ${new Date().toLocaleString(pc.locale)}</div></header><div class="summary"><div>${pc.colleges}<br><b>${reportColleges.length}</b></div><div>${pc.departments}<br><b>${reportDepartments.length}</b></div><div>${pc.subjects}<br><b>${reportSubjects.length}</b></div></div>${blocks || `<p>${pc.noColleges}</p>`}<footer>${pc.footer}</footer><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return notify(tr("اسمح بالنوافذ المنبثقة لتصدير التقرير", "Allow pop-ups to export the report"), "error");
    w.document.write(html);
    w.document.close();
  }
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        {tr("جاري التحميل...", "Loading...")}
      </div>
    );
  const academicItems =
    { universities, colleges, departments, subjects }[tab] || [];
  const parentOptions = (
    tab === "colleges"
      ? universities
      : tab === "departments"
        ? colleges
        : tab === "subjects"
          ? departments
          : []
  ).filter((x) => x.active !== false);
  return (
    <div
      className="admin-dashboard-shell min-h-screen bg-secondary-50 pb-12"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <Header />
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        danger={confirmState?.danger}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
      />
      {editingAcademic && (
        <div className="fixed inset-0 z-[100] bg-secondary-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {tr('تعديل', 'Edit')} {copy[tab]}
            </h3>
            <input
              autoFocus
              value={editAcademicName}
              onChange={(e) => setEditAcademicName(e.target.value)}
              className="w-full border rounded-xl p-3"
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingAcademic(null)}
                className="flex-1 bg-secondary-100 rounded-xl p-3"
              >
                {tr('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={saveAcademicEdit}
                className="flex-1 bg-primary-600 text-white rounded-xl p-3"
              >
                {tr('حفظ التعديلات', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="admin-dashboard-layout max-w-7xl mx-auto px-4 mt-8 space-y-6">
        <section className="admin-hero bg-white rounded-2xl border shadow-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="as-eyebrow"><FaUserShield /> {copy.control}</span>
              <h1 className="text-3xl font-bold text-secondary-900 mt-3">
                {copy.dashboard}
              </h1>
              <p className="text-secondary-500 mt-1">
                {copy.joinHint}
              </p>
              <div className="mt-3 text-xs inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700">
                <FaLock />
                {isSuperAdmin
                  ? isLegacyAdmin
                    ? tr("المدير الأعلى — ترحيل تلقائي للصلاحيات القديمة", "Super Admin — legacy permission migration")
                    : tr("المدير الأعلى — جميع الصلاحيات", "Super Admin — all permissions")
                  : tr("مدير محدود الصلاحيات", "Limited administrator")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="as-avatar !h-14 !w-14">
                <FaUserShield />
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-red-500 text-white flex items-center gap-2"
              >
                <FaSignOutAlt /> {tr('تسجيل الخروج', 'Log out')}
              </button>
            </div>
          </div>
        </section>
        <div
          className="admin-sidebar flex gap-2 overflow-x-auto pb-2"
          aria-label={tr("تنقل الإدارة", "Administration navigation")}
        >
          {visibleTabs.map(([k, l, I]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`shrink-0 px-4 py-3 rounded-xl border font-semibold flex items-center gap-2 ${tab === k ? "bg-primary-600 text-white" : "bg-white text-secondary-700"}`}
            >
              <span className="as-nav-icon">
                <I />
              </span>
              {l}
              {k === "requests" && pending.length > 0 ? (
                <span className="bg-red-500 text-white rounded-full px-2 text-xs">
                  {pending.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map(([l, n, I]) => (
                <div
                  key={l}
                  className="bg-white rounded-2xl border p-5 shadow-soft flex items-center justify-between"
                >
                  <div>
                    <p className="text-secondary-500 text-sm font-semibold">
                      {l}
                    </p>
                    <p className="text-3xl font-black mt-2 text-secondary-900">
                      {n}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-primary-50 to-cyan-50 rounded-2xl">
                    <I className="text-primary-600 text-2xl" />
                  </div>
                </div>
              ))}
            </section>
            <section className="grid lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 bg-white rounded-2xl border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black">
                      {language === 'ar' ? 'توزيع المستخدمين حسب الدور' : 'Users by Role'}
                    </h2>
                    <p className="mt-1 text-sm text-secondary-500">
                      {language === 'ar' ? 'قراءة مباشرة من الحسابات الحالية' : 'Directly from current accounts'}
                    </p>
                  </div>
                  <FaChartBar className="text-primary-600 text-2xl" />
                </div>
                <div className="mt-6 space-y-5">
                  {roleMetrics.map(([label, count, tone]) => (
                    <div key={label}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-bold text-secondary-700">
                          {label}
                        </span>
                        <b>{count}</b>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-secondary-100">
                        <div
                          className={`h-full rounded-full bg-gradient-to-l ${tone}`}
                          style={{
                            width: `${users.length ? Math.max(5, (count / users.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
                <h2 className="text-xl font-black">{copy.recent}</h2>
                <p className="mt-1 text-sm text-secondary-500">
                  {copy.recentHelp}
                </p>
                <div className="mt-5 space-y-3">
                  {logs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-secondary-100 bg-secondary-50 p-3"
                    >
                      <b className="block text-sm">
                        {actionLabels[log.action] ||
                          log.action ||
                          tr("عملية إدارية", "Administrative action")}
                      </b>
                      <span className="mt-1 block text-xs text-secondary-500">
                        {log.createdAt?.toDate
                          ? log.createdAt.toDate().toLocaleString(language === "ar" ? "ar-YE" : "en-US")
                          : "-"}
                      </span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="py-6 text-center text-sm text-secondary-500">
                      {language === 'ar' ? 'لا توجد أنشطة متاحة للعرض.' : 'No activity is available to display.'}
                    </p>
                  )}
                </div>
              </div>
            </section>
            <section className="bg-white rounded-2xl border p-6">
              <h2 className="text-xl font-bold mb-4">{copy.summary}</h2>
              <div className="grid md:grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-xl bg-green-50">
                  {copy.activeAccounts}
                  <br />
                  <b>
                    {
                      users.filter(
                        (x) =>
                          x.accountStatus !== "suspended" &&
                          x.accountStatus !== "blocked",
                      ).length
                    }
                  </b>
                </div>
                <div className="p-4 rounded-xl bg-yellow-50">
                  {copy.suspendedAccounts}
                  <br />
                  <b>
                    {
                      users.filter((x) => x.accountStatus === "suspended")
                        .length
                    }
                  </b>
                </div>
                <div className="p-4 rounded-xl bg-red-50">
                  {copy.blockedAccounts}
                  <br />
                  <b>
                    {users.filter((x) => x.accountStatus === "blocked").length}
                  </b>
                </div>
              </div>
            </section>
            <section className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border p-6">
                <h2 className="text-lg font-bold mb-3">{copy.system}</h2>
                <div
                  className={`p-4 rounded-xl ${fileHealth.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                >
                  {copy.fileApi}:{" "}
                  <b>
                    {fileHealth.loading
                      ? (language === 'ar' ? 'جاري الفحص...' : 'Checking...')
                      : fileHealth.ok
                        ? copy.working
                        : copy.unavailable}
                  </b>
                  {fileHealth.data?.maxFileMb && (
                    <div className="text-xs mt-1">
                      {tr("الحد الأقصى:", "Maximum:")} {fileHealth.data.maxFileMb}MB
                    </div>
                  )}
                </div>
                <div className="mt-3 p-4 rounded-xl bg-green-50 text-green-800">
                  {copy.firebase} ({language === 'ar' ? 'تم تحميل بيانات الإدارة' : 'administration data loaded'})
                </div>
              </div>
              <div className="bg-white rounded-2xl border p-6">
                <h2 className="text-lg font-bold mb-3">{language === 'ar' ? 'فحص سلامة العلاقات' : 'Relationship Integrity Check'}</h2>
                {integrityIssues.length === 0 ? (
                  <p className="p-4 rounded-xl bg-green-50 text-green-800">
                    {language === 'ar' ? 'لم يتم اكتشاف علاقات يتيمة مباشرة.' : 'No direct orphan relationships were found.'}
                  </p>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 text-amber-900">
                    <b>{integrityIssues.length} {tr("ملاحظة", "issue")}</b>
                    <ul className="list-disc list-inside mt-2 text-sm">
                      {integrityIssues.slice(0, 8).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {tab === "reports" && (
          <section className="bg-white rounded-2xl border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-bold">{tr('التقرير الأكاديمي التفصيلي', 'Detailed Academic Report')}</h2>
                <p className="text-sm text-secondary-500 mt-1">
                  {tr('اختر جامعة لعرض الهيكل: جامعة ← كلية ← قسم ← مادة، ثم صدّره PDF.', 'Choose a university to view University → College → Department → Subject, then export PDF.')}
                </p>
              </div>
              <button
                onClick={printAcademicReport}
                disabled={!reportUniversityId}
                className="px-5 py-3 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-40 flex items-center gap-2"
              >
                <FaFilePdf /> {tr('تصدير PDF', 'Export PDF')}
              </button>
            </div>
            <select
              value={reportUniversityId}
              onChange={(e) => setReportUniversityId(e.target.value)}
              className="w-full md:w-1/2 border rounded-xl p-3 mb-5"
            >
              <option value="">{tr('اختر الجامعة', 'Select a university')}</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.active === false ? tr("(موقوفة)", "(Inactive)") : ""}
                </option>
              ))}
            </select>
            {reportUniversity && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                  <div className="bg-primary-50 rounded-xl p-3">
                    {tr("الكليات", "Colleges")}
                    <br />
                    <b className="text-2xl">{reportColleges.length}</b>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-3">
                    {tr("الأقسام", "Departments")}
                    <br />
                    <b className="text-2xl">{reportDepartments.length}</b>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-3">
                    {tr("المواد", "Subjects")}
                    <br />
                    <b className="text-2xl">{reportSubjects.length}</b>
                  </div>
                </div>
                <div className="space-y-4">
                  {reportColleges.map((c) => (
                    <div key={c.id} className="border rounded-2xl p-4">
                      <h3 className="font-bold text-lg">
                        🏛️ {c.name}{" "}
                        <span className="text-xs font-normal text-secondary-500">
                          — {c.active === false ? tr("موقوفة", "Inactive") : tr("نشطة", "Active")}
                        </span>
                      </h3>
                      {reportDepartments
                        .filter((d) => d.collegeId === c.id)
                        .map((d) => (
                          <div
                            key={d.id}
                            className="mr-5 mt-3 border-r-4 border-primary-200 pr-4"
                          >
                            <b>📚 {d.name}</b>
                            <div className="mt-2 grid md:grid-cols-2 gap-2">
                              {reportSubjects
                                .filter((x) => x.departmentId === d.id)
                                .map((x) => (
                                  <div
                                    key={x.id}
                                    className="bg-secondary-50 rounded-lg p-2"
                                  >
                                    📖 {x.name}{" "}
                                    <span className="text-secondary-500">
                                      ({x.code || tr("بدون كود", "No code")})
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {tab === "requests" && (
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="text-2xl font-bold mb-5">
              {tr('طلبات انضمام مسؤولي التوظيف', 'Recruiter Join Requests')}
            </h2>
            {pending.length === 0 ? (
              <p className="text-center py-12 text-secondary-500">
                {tr('لا توجد طلبات معلقة حاليًا.', 'There are no pending join requests.')}
              </p>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <div
                    key={r.id}
                    className="border rounded-xl p-4 flex flex-wrap justify-between gap-4"
                  >
                    <div>
                      <b>
                        {r.firstName} {r.lastName}
                      </b>
                      <p>{r.email}</p>
                      <p className="text-sm text-secondary-500">
                        {r.university}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={Boolean(processingRequestId)}
                        onClick={() => processRequest(r, "approved")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                      >
                        <FaCheck className="inline ml-2" />
                        {processingRequestId === r.id
                          ? tr("جاري المعالجة...", "Processing...")
                          : tr('قبول', 'Approve')}
                      </button>
                      <button
                        disabled={Boolean(processingRequestId)}
                        onClick={() => processRequest(r, "rejected")}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                      >
                        <FaTimes className="inline ml-2" />
                        {tr('رفض', 'Reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "users" && (
          <section className="bg-white rounded-2xl border p-6">
            <div className="flex flex-wrap justify-between gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold">
                  {tr('إدارة الحسابات والصلاحيات', 'Accounts & Permissions')}
                </h2>
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowCreateAdmin(true)}
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold"
                  >
                    + {tr('إضافة مدير', 'Add Admin')}
                  </button>
                )}
              </div>
              <div className="relative">
                <FaSearch className="absolute right-3 top-3 text-secondary-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr('بحث بالاسم أو البريد', 'Search by name or email')}
                  className="border rounded-xl py-2 pr-10 pl-4"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary-50">
                    <th className="p-3">{tr('المستخدم', 'User')}</th>
                    <th>{tr('الصلاحية', 'Role')}</th><th>{tr('الحالة', 'Status')}</th><th>{tr('الإجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">
                        <b>
                          {u.firstName} {u.lastName}
                        </b>
                        <div className="text-secondary-500">{u.email}</div>
                        {userIsSuper(u) && (
                          <div className="text-xs text-red-600">
                            {tr("حساب المدير الأعلى محمي", "Protected Super Admin account")}
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          value={u.role || "lecturer"}
                          disabled={
                            u.id === auth.currentUser?.uid ||
                            userIsSuper(u) ||
                            (!isSuperAdmin && u.role === "admin")
                          }
                          onChange={(e) =>
                            updateUser(
                              u,
                              {
                                role: e.target.value,
                                ...(e.target.value === "admin"
                                  ? { adminLevel: "limited", permissions: [] }
                                  : {}),
                              },
                              tr("تم تعديل الصلاحية", "Role updated"),
                            )
                          }
                          className="border rounded-lg p-2 disabled:opacity-50"
                        >
                          <option value="lecturer">{tr("محاضر", "Lecturer")}</option>
                          <option value="recruiter">{tr("مسؤول توظيف", "Recruiter")}</option>
                          <option value="admin">{tr("مدير", "Administrator")}</option>
                        </select>
                        {u.role === "admin" &&
                          u.id !== auth.currentUser?.uid &&
                          !userIsSuper(u) &&
                          isSuperAdmin && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-primary-700">
                                {tr("تحديد صلاحيات المدير", "Set administrator permissions")}
                              </summary>
                              <div className="mt-2 grid gap-1">
                                {ADMIN_PERMISSIONS.map(([key, label]) => (
                                  <label
                                    key={key}
                                    className="text-xs flex items-center gap-2"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={(u.permissions || []).includes(
                                        key,
                                      )}
                                      onChange={(e) =>
                                        setAdminPermission(
                                          u,
                                          key,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </details>
                          )}
                      </td>
                      <td>
                        <span
                          className={`px-3 py-1 rounded-full ${u.accountStatus === "blocked" ? "bg-red-100 text-red-700" : u.accountStatus === "suspended" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}
                        >
                          {u.accountStatus === "blocked"
                            ? tr("محظور", "Blocked")
                            : u.accountStatus === "suspended"
                              ? tr("موقوف", "Suspended")
                              : tr("نشط", "Active")}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="px-3 py-2 border rounded-lg flex items-center gap-1"
                          >
                            <FaEdit /> {tr("تعديل", "Edit")}
                          </button>
                          {u.id !== auth.currentUser?.uid &&
                            !userIsSuper(u) && (
                              <>
                                <button
                                  onClick={() =>
                                    updateUser(
                                      u,
                                      {
                                        accountStatus:
                                          u.accountStatus === "suspended"
                                            ? "active"
                                            : "suspended",
                                      },
                                      u.accountStatus === "suspended"
                                        ? tr("تم تفعيل الحساب", "Account activated")
                                        : tr("تم إيقاف الحساب", "Account suspended"),
                                    )
                                  }
                                  className="px-3 py-2 border rounded-lg"
                                >
                                  {u.accountStatus === "suspended" ? (
                                    <FaPlay />
                                  ) : (
                                    <FaPause />
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    updateUser(
                                      u,
                                      {
                                        accountStatus:
                                          u.accountStatus === "blocked"
                                            ? "active"
                                            : "blocked",
                                      },
                                      u.accountStatus === "blocked"
                                        ? tr("تم فك الحظر", "Account unblocked")
                                        : tr("تم حظر الحساب", "Account blocked"),
                                    )
                                  }
                                  className="px-3 py-2 border border-red-200 text-red-600 rounded-lg"
                                >
                                  {u.accountStatus === "blocked"
                                    ? tr("فك الحظر", "Unblock")
                                    : tr("حظر", "Block")}
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "audit" && (
          <section className="bg-white rounded-2xl border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-bold">{tr('سجل العمليات الإدارية', 'Administrative Audit Log')}</h2>
                <span className="text-xs text-secondary-500">
                  {filteredLogs.length} {tr("عملية", "actions")}
                </span>
              </div>
              <input
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                placeholder={tr('بحث في العملية أو المدير أو التفاصيل', 'Search action, administrator, or details')}
                className="border rounded-xl p-2 min-w-[280px]"
              />
            </div>
            {filteredLogs.length === 0 ? (
              <p className="text-center py-12 text-secondary-500">
                {tr('لا توجد عمليات مطابقة.', 'No matching audit records.')}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary-50">
                        <th className="p-3">{tr("العملية", "Action")}</th>
                        <th>{tr("الهدف", "Target")}</th>
                        <th>{tr("المدير", "Administrator")}</th>
                        <th>{tr("التفاصيل", "Details")}</th>
                        <th>{tr("التاريخ والوقت", "Date and time")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs
                        .slice((auditPage - 1) * 25, auditPage * 25)
                        .map((l) => (
                          <tr key={l.id} className="border-t align-top">
                            <td className="p-3 font-semibold">
                              {actionLabels[l.action] || l.action}
                            </td>
                            <td>{l.target || "-"}</td>
                            <td>{adminName(l.adminId)}</td>
                            <td className="max-w-md break-words text-xs text-secondary-600">
                              {cleanDetails(l.details)}
                            </td>
                            <td className="whitespace-nowrap text-xs">
                              {l.createdAt?.toDate
                                ? l.createdAt.toDate().toLocaleString(language === "ar" ? "ar-YE" : "en-US")
                                : "-"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-center items-center gap-3 mt-4">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => p - 1)}
                    className="px-3 py-2 border rounded-lg disabled:opacity-40"
                  >
                    {tr("السابق", "Previous")}
                  </button>
                  <span>
                    {tr("صفحة", "Page")} {auditPage} {tr("من", "of")} {auditPages}
                  </span>
                  <button
                    disabled={auditPage >= auditPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="px-3 py-2 border rounded-lg disabled:opacity-40"
                  >
                    {tr("التالي", "Next")}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {config[tab] && (
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="text-2xl font-bold mb-5">
              {tr('إدارة', 'Manage')} {copy[tab]}
            </h2>
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`${tr('الاسم', 'Name')} ${copy[tab]}`}
                className="border rounded-xl p-3"
              />
              {tab === "subjects" && (
                <input
                  value={parentId ? makeSubjectCode() : ""}
                  readOnly
                  placeholder={tr('يُولّد تلقائيًا بعد اختيار القسم', 'Generated automatically after selecting a department')}
                  className="border rounded-xl p-3 bg-secondary-50 text-secondary-500"
                />
              )}
              {parentOptions.length > 0 && (
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="border rounded-xl p-3"
                >
                  <option value="">
                    {tab === "colleges"
                      ? tr('اختر الجامعة', 'Select a university')
                      : tab === "departments"
                        ? tr('اختر الكلية', 'Select a college')
                        : tr('اختر القسم', 'Select a department')}
                  </option>
                  {parentOptions.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={addAcademic}
                className="bg-primary-600 text-white rounded-xl px-5 py-3"
              >
                + {tr('إضافة', 'Add')}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {academicItems.map((x) => (
                <div
                  key={x.id}
                  className="border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <b>{x.name}</b>
                    {x.code && (
                      <span className="text-secondary-500 mr-2">
                        ({x.code})
                      </span>
                    )}
                    <div className="text-xs text-secondary-500 mt-1">
                      {tab === "colleges"
                        ? universities.find((u) => u.id === x.universityId)
                            ?.name || tr("جامعة غير محددة", "University not specified")
                        : tab === "departments"
                          ? colleges.find((c) => c.id === x.collegeId)?.name ||
                            tr("كلية غير محددة", "College not specified")
                          : tab === "subjects"
                            ? (() => {
                                const d = departments.find(
                                  (d) => d.id === x.departmentId,
                                );
                                const c = colleges.find(
                                  (c) => c.id === d?.collegeId,
                                );
                                const u = universities.find(
                                  (u) => u.id === c?.universityId,
                                );
                                return `${u?.name || tr("جامعة غير محددة", "University not specified")} ← ${c?.name || tr("كلية غير محددة", "College not specified")} ← ${d?.name || tr("قسم غير محدد", "Department not specified")}`;
                              })()
                            : ""}
                    </div>
                    <div className="text-xs mt-1">
                      {x.active === false ? tr('موقوف', 'Inactive') : tr('نشط', 'Active')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      title={tr('تعديل', 'Edit')}
                      onClick={() => editAcademic(x)}
                      className="p-2 border rounded-lg text-primary-600"
                    >
                      <FaEdit />
                    </button>
                    <button
                      title={tr('تفعيل/إيقاف', 'Enable / Disable')}
                      onClick={() => toggleAcademic(x)}
                      className="p-2 border rounded-lg"
                    >
                      {x.active === false ? <FaPlay /> : <FaPause />}
                    </button>
                    <button
                      title={tr('حذف', 'Delete')}
                      onClick={() => removeAcademic(x)}
                      className="p-2 border border-red-200 text-red-600 rounded-lg"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {academicItems.length === 0 && (
              <p className="text-center text-secondary-500 py-8">
                {tr('لا توجد بيانات بعد. أضف أول عنصر من الأعلى.', 'No records yet. Add the first item above.')}
              </p>
            )}
          </section>
        )}
      </main>
      {showCreateAdmin && (
        <div className="fixed inset-0 z-[110] bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl">
            <h3 className="text-xl font-bold mb-1">
              {tr('إضافة مدير محدود الصلاحيات', 'Add Limited Admin')}
            </h3>
            <p className="text-sm text-secondary-500 mb-4">
              {tr('ينشئ حساب دخول مستقل دون تسجيل خروج الـSuper Admin الحالي.', 'Creates a separate sign-in account without signing out the current Super Admin.')}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="border rounded-xl p-3"
                placeholder={tr('الاسم الأول', 'First Name')}
                value={adminForm.firstName}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, firstName: e.target.value })
                }
              />
              <input
                className="border rounded-xl p-3"
                placeholder={tr('اسم العائلة', 'Last Name')}
                value={adminForm.lastName}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, lastName: e.target.value })
                }
              />
              <input
                className="border rounded-xl p-3 sm:col-span-2"
                type="email"
                placeholder={tr('البريد الإلكتروني', 'Email')}
                value={adminForm.email}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, email: e.target.value })
                }
              />
              <input
                className="border rounded-xl p-3 sm:col-span-2"
                type="password"
                placeholder={tr('كلمة المرور (6 أحرف على الأقل)', 'Password (at least 6 characters)')}
                value={adminForm.password}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, password: e.target.value })
                }
              />
            </div>
            <div className="mt-4">
              <b className="text-sm">{tr('الصلاحيات المسموحة', 'Allowed Permissions')}</b>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {ADMIN_PERMISSIONS.map(([key, label]) => (
                  <label
                    key={key}
                    className="border rounded-xl p-3 text-sm flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={adminForm.permissions.includes(key)}
                      onChange={(e) =>
                        setAdminForm({
                          ...adminForm,
                          permissions: e.target.checked
                            ? [...adminForm.permissions, key]
                            : adminForm.permissions.filter((x) => x !== key),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                disabled={creatingAdmin}
                onClick={() => setShowCreateAdmin(false)}
                className="px-4 py-2 border rounded-xl"
              >
                {tr('إلغاء', 'Cancel')}
              </button>
              <button
                disabled={creatingAdmin}
                onClick={createLimitedAdmin}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl disabled:opacity-50"
              >
                {creatingAdmin ? tr('جاري الإنشاء...', 'Creating...') : tr('إنشاء المدير', 'Create Admin')}
              </button>
            </div>
          </div>
        </div>
      )}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{tr('تعديل بيانات المستخدم', 'Edit Account')}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="border rounded-xl p-3"
                placeholder={tr('الاسم الأول', 'First Name')}
                value={editingUser.firstName || ""}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, firstName: e.target.value })
                }
              />
              <input
                className="border rounded-xl p-3"
                placeholder={tr('اسم العائلة', 'Last Name')}
                value={editingUser.lastName || ""}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, lastName: e.target.value })
                }
              />
              <input
                className="border rounded-xl p-3"
                placeholder={tr('الهاتف', 'Phone')}
                value={editingUser.phone || ""}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, phone: e.target.value })
                }
              />
              <input
                className="border rounded-xl p-3"
                placeholder={tr('الجامعة', 'University')}
                value={editingUser.university || ""}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, university: e.target.value })
                }
              />
              <input
                className="border rounded-xl p-3 sm:col-span-2"
                placeholder={tr('القسم', 'Department')}
                value={editingUser.department || ""}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, department: e.target.value })
                }
              />
            </div>
            <p className="text-xs text-secondary-500 mt-3">
              {tr('لأسباب أمنية لا تُعرض كلمات المرور هنا. استخدم نظام استعادة كلمة المرور لإعادة تعيينها.', 'Passwords are not displayed here for security. Use password recovery to reset one.')}
            </p>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border rounded-xl"
              >
                {tr('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={saveUserEdit}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl"
              >
                {tr('حفظ التعديلات', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
