const { useState, useEffect } = React;
const { createPortal } = ReactDOM;

const TWEAK_DEFAULTS = {
  theme: "pentagram",
  accentColor: "#111111",
  density: "comfortable",
  layout: "split",
  avatarStyle: "rounded",
  previewA4: false,
};

const PRESET_COLORS = [
  { name: "经典炭黑", value: "#111111" },
  { name: "石墨中灰", value: "#4B5563" },
  { name: "普鲁士蓝", value: "#1E3A8A" },
  { name: "深海靛青", value: "#0F172A" },
  { name: "铁锈赤红", value: "#8C2D19" },
];

function useTweaks() {
  const [tweaks, setTweaks] = useState(() => {
    try {
      const stored = localStorage.getItem("design-tweaks-resume");
      return stored ? { ...TWEAK_DEFAULTS, ...JSON.parse(stored) } : TWEAK_DEFAULTS;
    } catch {
      return TWEAK_DEFAULTS;
    }
  });

  const update = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    try {
      localStorage.setItem("design-tweaks-resume", JSON.stringify(next));
    } catch { }
  };

  const reset = () => {
    setTweaks(TWEAK_DEFAULTS);
    try {
      localStorage.removeItem("design-tweaks-resume");
    } catch { }
  };

  return { tweaks, update, reset };
}

function TweaksPanel({ tweaks, update, reset }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const bodyClassList = document.body.classList;
    bodyClassList.remove("theme-pentagram", "theme-brockmann", "theme-hara");
    bodyClassList.add(`theme-${tweaks.theme}`);
    document.body.style.setProperty("--tweak-accent", tweaks.accentColor);
  }, [tweaks.theme, tweaks.accentColor]);

  return (
    <>
      <div
        className={`tweaks-panel ${isOpen ? "is-open" : ""}`}
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <button
          onClick={() => setIsOpen(current => !current)}
          className="action-button action-button-secondary"
        >
          <span>排版调参</span>
        </button>
      </div>
      {isOpen && (
        <div className="tweaks-sheet" style={{
          fontSize: "13px",
          color: "#1E293B",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            borderBottom: "1px solid #F1F5F9",
            paddingBottom: "8px",
          }}>
            <strong style={{ fontSize: "14px", fontWeight: "600" }}>简历排版面板</strong>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#64748B",
                lineHeight: 1
              }}
            >×</button>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <span style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#64748B" }}>设计哲学流派</span>
            <select
              value={tweaks.theme}
              onChange={e => update({ theme: e.target.value })}
              style={{
                width: "100%",
                padding: "6px 8px",
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
                background: "#FFFFFF",
                color: "#1E293B",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="pentagram">Pentagram (经典排印)</option>
              <option value="brockmann">Müller-Brockmann (瑞士网格)</option>
              <option value="hara">原研哉 (留白之禅)</option>
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <span style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#64748B" }}>主题配色</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  title={c.name}
                  onClick={() => update({ accentColor: c.value })}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: tweaks.accentColor === c.value ? "2px solid #000" : "1px solid #E2E8F0",
                    background: c.value,
                    cursor: "pointer",
                    padding: 0
                  }}
                />
              ))}
              <input
                type="color"
                value={tweaks.accentColor}
                onChange={e => update({ accentColor: e.target.value })}
                style={{
                  width: "20px",
                  height: "20px",
                  padding: 0,
                  border: "1px solid #E2E8F0",
                  cursor: "pointer",
                  borderRadius: "50%",
                  overflow: "hidden"
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <span style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#64748B" }}>布局结构</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => update({ layout: "split" })}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  border: tweaks.layout === "split" ? "1px solid #1E293B" : "1px solid #E2E8F0",
                  background: tweaks.layout === "split" ? "#F1F5F9" : "#FFFFFF",
                  color: "#1E293B",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >左右分栏</button>
              <button
                onClick={() => update({ layout: "flat" })}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  border: tweaks.layout === "flat" ? "1px solid #1E293B" : "1px solid #E2E8F0",
                  background: tweaks.layout === "flat" ? "#F1F5F9" : "#FFFFFF",
                  color: "#1E293B",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >上下通栏</button>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <span style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#64748B" }}>头像几何形状</span>
            <div style={{ display: "flex", gap: "6px" }}>
              {["circle", "rounded", "square"].map(s => (
                <button
                  key={s}
                  onClick={() => update({ avatarStyle: s })}
                  style={{
                    flex: 1,
                    padding: "4px",
                    border: tweaks.avatarStyle === s ? "1px solid #1E293B" : "1px solid #E2E8F0",
                    background: tweaks.avatarStyle === s ? "#F1F5F9" : "#FFFFFF",
                    color: "#1E293B",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  {s === "circle" ? "正圆" : s === "rounded" ? "圆角" : "方形"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <span style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#64748B" }}>版面紧凑度</span>
            <div style={{ display: "flex", gap: "6px" }}>
              {["compact", "comfortable", "spacious"].map(d => (
                <button
                  key={d}
                  onClick={() => update({ density: d })}
                  style={{
                    flex: 1,
                    padding: "4px",
                    border: tweaks.density === d ? "1px solid #1E293B" : "1px solid #E2E8F0",
                    background: tweaks.density === d ? "#F1F5F9" : "#FFFFFF",
                    color: "#1E293B",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  {d === "compact" ? "紧凑" : d === "comfortable" ? "舒适" : "宽松"}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            borderTop: "1px solid #F1F5F9",
            paddingTop: "12px"
          }}>
            <span style={{ fontWeight: "500", color: "#64748B" }}>纸张打印预览 (A4)</span>
            <input
              type="checkbox"
              checked={tweaks.previewA4}
              onChange={e => update({ previewA4: e.target.checked })}
              style={{
                width: "16px",
                height: "16px",
                cursor: "pointer"
              }}
            />
          </div>

          <button
            onClick={reset}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#F1F5F9",
              color: "#475569",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
              textAlign: "center"
            }}
          >恢复默认设置</button>
        </div>
      )}
    </>
  );
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeResumeData(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const personalInfo = source.personalInfo || {};
  const contact = personalInfo.contact || {};

  return {
    personalInfo: {
      name: personalInfo.name || "未命名用户",
      age: Number(personalInfo.age || 0),
      experienceYears: Number(personalInfo.experienceYears || 0),
      education: personalInfo.education || "",
      status: personalInfo.status || "",
      contact: {
        phone: contact.phone || "",
        email: contact.email || "",
      },
    },
    title: source.title || "",
    advantages: asArray(source.advantages),
    skills: asArray(source.skills).map(group => ({
      category: group?.category || "",
      items: asArray(group?.items),
    })),
    experience: asArray(source.experience).map(exp => ({
      company: exp?.company || "",
      role: exp?.role || "",
      period: exp?.period || "",
      projects: asArray(exp?.projects).map(project => ({
        name: project?.name || "",
        period: project?.period || "",
        points: asArray(project?.points),
      })),
    })),
  };
}

function linesToArray(value) {
  return value
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}

function tagsToArray(value) {
  return value
    .split(/[,\n，、]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function userApiPath(path, userId) {
  return `${path}?userId=${encodeURIComponent(userId)}`;
}

function downloadJson(data, user) {
  const safeName = (user?.displayName || data.personalInfo?.name || "resume")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "resume";
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.resume.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function EditorField({ label, children }) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function UserSwitcher({ users, activeUserId, dirty, onSelect, onCreate }) {
  const [name, setName] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    onCreate(nextName);
    setName("");
  };

  return (
    <form className="user-switcher" onSubmit={submit}>
      <div className="user-switcher-head">
        <span className="user-switcher-title">当前用户</span>
        {dirty && <span className="user-switcher-dirty">未保存</span>}
      </div>
      <div className="user-switcher-row">
        <select
          value={activeUserId || ""}
          onChange={event => onSelect(event.target.value)}
          aria-label="选择用户"
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="新用户姓名"
        />
        <button type="submit">新建</button>
      </div>
    </form>
  );
}

function ResumeEditor({ data, user, onChange, onReplaceData, onSave, dirty, saveState, onAvatarUpload, avatarUploading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(data, null, 2));
      setJsonError("");
    }
  }, [isOpen, data, user?.id]);

  const mutate = (producer) => {
    onChange(producer);
  };

  const setPersonal = (field, value) => {
    mutate(next => {
      next.personalInfo[field] = value;
    });
  };

  const setContact = (field, value) => {
    mutate(next => {
      next.personalInfo.contact[field] = value;
    });
  };

  const setResumeField = (field, value) => {
    mutate(next => {
      next[field] = value;
    });
  };

  const setSkill = (skillIndex, field, value) => {
    mutate(next => {
      next.skills[skillIndex][field] = value;
    });
  };

  const setExperience = (expIndex, field, value) => {
    mutate(next => {
      next.experience[expIndex][field] = value;
    });
  };

  const setProject = (expIndex, projectIndex, field, value) => {
    mutate(next => {
      next.experience[expIndex].projects[projectIndex][field] = value;
    });
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const normalized = normalizeResumeData(parsed);
      onReplaceData(normalized);
      setJsonText(JSON.stringify(normalized, null, 2));
      setJsonError("");
    } catch (error) {
      setJsonError(error.message || "JSON 格式不正确");
    }
  };

  return (
    <>
      <button
        type="button"
        className="action-button action-button-primary editor-launch"
        onClick={() => setIsOpen(true)}
      >
        编辑内容
        {dirty && <span className="editor-dot" />}
      </button>

      {isOpen && createPortal(
        <aside className="editor-drawer no-print">
          <div className="editor-sticky-head">
            <div>
              <div className="editor-eyebrow">{user?.displayName || "当前用户"}</div>
              <h2>内容编辑</h2>
            </div>
            <button type="button" className="editor-icon-button" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="editor-actions">
            <label className="editor-upload-button">
              {avatarUploading ? "上传中..." : "上传头像"}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files[0];
                  if (file) {
                    onAvatarUpload(file);
                  }
                  event.target.value = "";
                }}
              />
            </label>
            <button type="button" className="editor-save-button" onClick={onSave} disabled={!dirty || saveState === "saving"}>
              {saveState === "saving" ? "保存中..." : "保存到 SQLite"}
            </button>
          </div>

          <div className="editor-actions editor-actions-json">
            <button type="button" className="editor-upload-button" onClick={() => downloadJson(data, user)}>
              导出 JSON
            </button>
            <button type="button" className="editor-upload-button" onClick={() => setJsonText(JSON.stringify(data, null, 2))}>
              刷新 JSON
            </button>
          </div>

          {saveState !== "idle" && (
            <div className={`editor-status status-${saveState}`}>
              {saveState === "saved" && "已保存"}
              {saveState === "saving" && "正在写入"}
              {saveState === "error" && "保存失败"}
            </div>
          )}

          <section className="editor-section">
            <h3>基础信息</h3>
            <div className="editor-two-col">
              <EditorField label="姓名">
                <input value={data.personalInfo.name || ""} onChange={e => setPersonal("name", e.target.value)} />
              </EditorField>
              <EditorField label="状态">
                <input value={data.personalInfo.status || ""} onChange={e => setPersonal("status", e.target.value)} />
              </EditorField>
              <EditorField label="年龄">
                <input type="number" value={data.personalInfo.age || ""} onChange={e => setPersonal("age", Number(e.target.value || 0))} />
              </EditorField>
              <EditorField label="经验年限">
                <input type="number" value={data.personalInfo.experienceYears || ""} onChange={e => setPersonal("experienceYears", Number(e.target.value || 0))} />
              </EditorField>
            </div>
            <EditorField label="教育">
              <textarea
                rows="3"
                value={data.personalInfo.education || ""}
                onChange={e => setPersonal("education", e.target.value)}
                placeholder="例如：&#10;硕士 / 清华大学 (2020 - 2023)&#10;学士 / 北京大学 (2016 - 2020)"
              />
            </EditorField>
            <div className="editor-two-col">
              <EditorField label="手机">
                <input value={data.personalInfo.contact.phone || ""} onChange={e => setContact("phone", e.target.value)} />
              </EditorField>
              <EditorField label="邮箱">
                <input value={data.personalInfo.contact.email || ""} onChange={e => setContact("email", e.target.value)} />
              </EditorField>
            </div>
          </section>

          <section className="editor-section">
            <h3>简历内容</h3>
            <EditorField label="标题">
              <input value={data.title || ""} onChange={e => setResumeField("title", e.target.value)} />
            </EditorField>
            <EditorField label="个人优势">
              <textarea
                rows="7"
                value={(data.advantages || []).join("\n")}
                onChange={e => setResumeField("advantages", linesToArray(e.target.value))}
              />
            </EditorField>
          </section>

          <section className="editor-section">
            <div className="editor-section-title-row">
              <h3>核心技能</h3>
              <button
                type="button"
                className="editor-mini-button"
                onClick={() => mutate(next => next.skills.push({ category: "新技能", items: [] }))}
              >
                添加
              </button>
            </div>
            {(data.skills || []).map((skill, skillIndex) => (
              <div className="editor-block" key={skillIndex}>
                <div className="editor-block-head">
                  <strong>{skill.category || `技能 ${skillIndex + 1}`}</strong>
                  <button
                    type="button"
                    className="editor-text-button"
                    onClick={() => mutate(next => next.skills.splice(skillIndex, 1))}
                  >
                    删除
                  </button>
                </div>
                <EditorField label="分类">
                  <input value={skill.category || ""} onChange={e => setSkill(skillIndex, "category", e.target.value)} />
                </EditorField>
                <EditorField label="技能项">
                  <textarea
                    rows="3"
                    value={(skill.items || []).join("\n")}
                    onChange={e => setSkill(skillIndex, "items", tagsToArray(e.target.value))}
                  />
                </EditorField>
              </div>
            ))}
          </section>

          <section className="editor-section">
            <div className="editor-section-title-row">
              <h3>工作经历</h3>
              <button
                type="button"
                className="editor-mini-button"
                onClick={() => mutate(next => next.experience.push({
                  company: "公司名称",
                  role: "职位",
                  period: "",
                  projects: [],
                }))}
              >
                添加
              </button>
            </div>
            {(data.experience || []).map((exp, expIndex) => (
              <details className="editor-block" key={expIndex} open={expIndex === 0}>
                <summary>
                  <span>{exp.company || `经历 ${expIndex + 1}`}</span>
                  <button
                    type="button"
                    className="editor-text-button"
                    onClick={(event) => {
                      event.preventDefault();
                      mutate(next => next.experience.splice(expIndex, 1));
                    }}
                  >
                    删除
                  </button>
                </summary>
                <div className="editor-two-col">
                  <EditorField label="公司">
                    <input value={exp.company || ""} onChange={e => setExperience(expIndex, "company", e.target.value)} />
                  </EditorField>
                  <EditorField label="职位">
                    <input value={exp.role || ""} onChange={e => setExperience(expIndex, "role", e.target.value)} />
                  </EditorField>
                </div>
                <EditorField label="时间">
                  <input value={exp.period || ""} onChange={e => setExperience(expIndex, "period", e.target.value)} />
                </EditorField>

                <div className="editor-section-title-row compact">
                  <h3>项目</h3>
                  <button
                    type="button"
                    className="editor-mini-button"
                    onClick={() => mutate(next => next.experience[expIndex].projects.push({
                      name: "项目名称",
                      period: "",
                      points: [],
                    }))}
                  >
                    添加
                  </button>
                </div>

                {(exp.projects || []).map((project, projectIndex) => (
                  <div className="editor-project" key={projectIndex}>
                    <div className="editor-block-head">
                      <strong>{project.name || `项目 ${projectIndex + 1}`}</strong>
                      <button
                        type="button"
                        className="editor-text-button"
                        onClick={() => mutate(next => next.experience[expIndex].projects.splice(projectIndex, 1))}
                      >
                        删除
                      </button>
                    </div>
                    <EditorField label="项目名">
                      <input value={project.name || ""} onChange={e => setProject(expIndex, projectIndex, "name", e.target.value)} />
                    </EditorField>
                    <EditorField label="时间">
                      <input value={project.period || ""} onChange={e => setProject(expIndex, projectIndex, "period", e.target.value)} />
                    </EditorField>
                    <EditorField label="要点">
                      <textarea
                        rows="5"
                        value={(project.points || []).join("\n")}
                        onChange={e => setProject(expIndex, projectIndex, "points", linesToArray(e.target.value))}
                      />
                    </EditorField>
                  </div>
                ))}
              </details>
            ))}
          </section>

          <section className="editor-section">
            <div className="editor-section-title-row">
              <h3>直接编辑 JSON</h3>
              <button type="button" className="editor-mini-button" onClick={applyJson}>
                应用 JSON
              </button>
            </div>
            <textarea
              className="editor-json-area"
              spellCheck="false"
              value={jsonText}
              onChange={event => {
                setJsonText(event.target.value);
                setJsonError("");
              }}
            />
            {jsonError && <div className="editor-json-error">{jsonError}</div>}
          </section>
        </aside>
      , document.body)}
    </>
  );
}

function Avatar({ styleClass, photoSrc, name, onUpload, uploading }) {
  const initial = (name || "简").trim().slice(0, 1);

  const handlePhotoClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        onUpload(file);
      }
    };
    input.click();
  };

  return (
    <div
      className={`avatar-container radius-${styleClass} ${photoSrc ? "has-photo" : ""}`}
      onClick={handlePhotoClick}
      title="点击上传个人照片"
      style={{ cursor: "pointer" }}
    >
      {photoSrc ? (
        <img src={photoSrc} alt={name || "个人头像"} className="avatar-image" />
      ) : (
        <div className="avatar-placeholder">{initial}</div>
      )}
      {uploading && <div className="avatar-uploading">上传中</div>}
    </div>
  );
}

function App() {
  const { tweaks, update, reset } = useTweaks();
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const [data, setData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const setProfile = (profile) => {
    setActiveUserId(profile.user.id);
    setActiveUser(profile.user);
    setData(normalizeResumeData(profile.data));
    setAvatarUrl(profile.avatarUrl || "");
    setAvatarVersion(Date.now());
    setDirty(false);
    setSaveState("idle");
    try {
      localStorage.setItem("active-resume-user", profile.user.id);
    } catch { }
  };

  const loadProfile = async (userId) => {
    const response = await fetch(userApiPath("/api/resume", userId));
    const profile = await response.json();
    if (!response.ok) {
      throw new Error(profile.error || "加载用户失败");
    }
    setProfile(profile);
  };

  const refreshUsers = async (preferredUserId) => {
    const response = await fetch("/api/users");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "加载用户列表失败");
    }

    setUsers(payload.users);
    const storedUserId = (() => {
      try {
        return localStorage.getItem("active-resume-user");
      } catch {
        return "";
      }
    })();
    const nextUserId = preferredUserId
      || (payload.users.some(user => user.id === storedUserId) ? storedUserId : "")
      || payload.activeUserId
      || payload.users[0]?.id;

    if (nextUserId) {
      await loadProfile(nextUserId);
    }
  };

  useEffect(() => {
    refreshUsers()
      .catch(err => {
        console.error("加载简历数据失败:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateData = (producer) => {
    setData(current => {
      const next = deepClone(current);
      producer(next);
      return next;
    });
    setDirty(true);
    setSaveState("idle");
  };

  const replaceData = (nextData) => {
    setData(normalizeResumeData(nextData));
    setDirty(true);
    setSaveState("idle");
  };

  const selectUser = async (userId) => {
    if (!userId || userId === activeUserId) return;
    if (dirty && !window.confirm("当前修改尚未保存，确定切换用户吗？")) {
      return;
    }

    setLoading(true);
    try {
      await loadProfile(userId);
    } catch (error) {
      console.error("切换用户失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (name) => {
    if (dirty && !window.confirm("当前修改尚未保存，确定新建用户吗？")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sourceUserId: activeUserId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "新建用户失败");
      }
      setUsers(payload.users);
      setProfile(payload.profile);
    } catch (error) {
      console.error("新建用户失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveResume = async () => {
    if (!data || !activeUserId) return;
    setSaveState("saving");
    try {
      const response = await fetch(userApiPath("/api/resume", activeUserId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const profile = await response.json();
      if (!response.ok) {
        throw new Error(profile.error || "保存失败");
      }
      setProfile(profile);
      setUsers(current => current.map(user => user.id === profile.user.id ? profile.user : user));
      setSaveState("saved");
    } catch (error) {
      console.error("保存简历数据失败:", error);
      setSaveState("error");
    }
  };

  const uploadAvatar = async (file) => {
    if (!file || !file.type.startsWith("image/") || !activeUserId) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch(userApiPath("/api/avatar", activeUserId), {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "头像上传失败");
      }
      setActiveUser(result.user);
      setUsers(current => current.map(user => user.id === result.user.id ? result.user : user));
      setAvatarUrl(result.avatarUrl);
      setAvatarVersion(Date.now());
    } catch (error) {
      console.error("头像上传失败:", error);
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="app-loading">
        正在加载简历数据...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-loading app-error">
        加载简历数据失败，请确认服务端已启动并可访问 SQLite。
      </div>
    );
  }

  const wrapperClass = `resume-wrapper ${tweaks.layout === "flat" ? "flat-layout" : ""}`;
  const outerClass = tweaks.previewA4 ? "preview-mode-a4" : "";
  const firstEduLine = (data.personalInfo.education || "").split("\n")[0] || "";
  const educationBrief = firstEduLine.split(" / ")[0] || firstEduLine;
  const displayAvatar = avatarUrl.startsWith("/uploads/")
    ? `${avatarUrl}?v=${avatarVersion}`
    : avatarUrl;

  return (
    <div className={`density-${tweaks.density} ${outerClass}`}>
      <div className={wrapperClass}>
        <header className="header-section">
          <div className="header-info">
            <h1>{data.personalInfo.name}</h1>
            <div className="header-subtitle">{data.title}</div>
            <div className="header-meta">
              <span>{data.personalInfo.age}岁</span>
              <span>{data.personalInfo.experienceYears}年经验</span>
              <span>{educationBrief}</span>
              <span>{data.personalInfo.status}</span>
            </div>
            <div className="header-meta" style={{ marginTop: "6px" }}>
              <span>{data.personalInfo.contact.email}</span>
              <span>{data.personalInfo.contact.phone}</span>
            </div>
          </div>

          <Avatar
            styleClass={tweaks.avatarStyle}
            photoSrc={displayAvatar}
            name={data.personalInfo.name}
            onUpload={uploadAvatar}
            uploading={avatarUploading}
          />
        </header>

        <div className="grid-layout">
          <section className="section">
            <h2 className="section-title">个人优势</h2>
            <div className="section-content">
              <ul className="advantage-list">
                {(data.advantages || []).map((adv, idx) => (
                  <li key={idx} className="advantage-item">{adv}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">核心技能</h2>
            <div className="section-content">
              <div className="skills-grid">
                {(data.skills || []).map((skillGroup, idx) => (
                  <div key={idx} className="skill-category">
                    <span className="skill-cat-name">{skillGroup.category}</span>
                    <div className="skill-tags">
                      {(skillGroup.items || []).map((item, sIdx) => (
                        <span key={sIdx} className="skill-tag">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">工作经历</h2>
            <div className="section-content" style={{ gap: "24px" }}>
              {(data.experience || []).map((exp, idx) => (
                <div key={idx} className="experience-item">
                  <div className="exp-header">
                    <span className="exp-title">{exp.company} | {exp.role}</span>
                    <span className="exp-period">{exp.period}</span>
                  </div>
                  {(exp.projects || []).map((proj, pIdx) => (
                    <div key={pIdx} className="project-item">
                      <div className="project-title">
                        <span>{proj.name}</span>
                        {proj.period && <span style={{ fontSize: "11px", fontWeight: "normal", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{proj.period}</span>}
                      </div>
                      <ul className="project-bullets">
                        {(proj.points || []).map((pt, ptIdx) => (
                          <li key={ptIdx} className="project-bullet">{pt}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">教育经历</h2>
            <div className="section-content" style={{ gap: "8px" }}>
              {(data.personalInfo.education || "").split("\n").map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-base)" }}>
                    <span style={{ fontWeight: "bold" }}>{trimmed}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="action-hub no-print">
        <UserSwitcher
          users={users}
          activeUserId={activeUserId}
          dirty={dirty}
          onSelect={selectUser}
          onCreate={createUser}
        />
        <div className="action-hub-buttons">
          <ResumeEditor
            data={data}
            user={activeUser}
            onChange={updateData}
            onReplaceData={replaceData}
            onSave={saveResume}
            dirty={dirty}
            saveState={saveState}
            onAvatarUpload={uploadAvatar}
            avatarUploading={avatarUploading}
          />
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={() => window.print()}
          >
            <span>导出 PDF</span>
          </button>
          <TweaksPanel tweaks={tweaks} update={update} reset={reset} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { App });
