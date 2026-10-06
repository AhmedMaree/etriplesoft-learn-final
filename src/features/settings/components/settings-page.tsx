"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, CalendarDays, Bell, GraduationCap, BarChart3, User, Mail, Lock, Building2, Globe, Languages, Camera, Pencil, CreditCard } from 'lucide-react';
import { Button, Panel } from '@/components/ui/primitives';
import { SettingsField, parseProfileFields } from '@/features/settings/components/settings-field';
import { Avatar } from '@/components/shared/profile-avatar';
import { saveStored, useStoredValue } from '@/lib/browser/demo-storage';
import { useDemoToast } from '@/lib/browser/demo-toast';
import { useTranslations } from 'next-intl';
import { Field } from '@/components/ui/field';
import { useLocaleChange } from '@/i18n/use-locale-change';

export function SettingsPage() {
  const t = useTranslations('settings');
  const common = useTranslations('common');
  const { locale, changeLocale } = useLocaleChange();
  const notify = useDemoToast();

  const [tab, setTab] = useState("Profile");
  const savedPhoto = useStoredValue("profile-photo", "");
  const savedBio = useStoredValue(
    "profile-bio",
    "Computer engineering student passionate about software development and AI.\nExcited to keep learning!",
  );
  const savedPreferences = useStoredValue("preferences", "{}");
  const savedProfileData = useStoredValue("profile-data", "{}");
  const profileFields = parseProfileFields(savedProfileData);
  const learnerName = useStoredValue("learner-name", "Ahmed Salah");
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [toggleDraft, setToggleDraft] =
    useState<Record<string, boolean> | null>(null);
  const photo = photoDraft ?? savedPhoto;
  const bio = bioDraft ?? savedBio;
  let storedPreferences: Record<string, boolean> = {};
  try {
    const parsed: unknown = JSON.parse(savedPreferences);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "boolean") storedPreferences[key] = value;
      }
    }
  } catch {
    storedPreferences = {};
  }
  const toggles = toggleDraft ?? storedPreferences;
  const [formVersion, setFormVersion] = useState(0);
  const settings = [
    ["Profile", "profile", "profileDescription"],
    ["Account", "account", "accountDescription"],
    ["Security", "security", "securityDescription"],
    ["Notifications", "notifications", "notificationsDescription"],
    ["Learning Preferences", "learningPreferences", "learningDescription"],
    ["AI Assistant Preferences", "aiPreferences", "aiDescription"],
  ] as const;
  const tabTitle = settings.find(([key]) => key === tab)?.[1] ?? "profile";
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (tab === "Security") {
      if (data.get("New Password") !== data.get("Confirm New Password")) {
        notify("The new passwords do not match.");
        return;
      }
      if (String(data.get("New Password")).length < 8) {
        notify("Use at least 8 characters for your new password.");
        return;
      }
      notify(
        "Password validated. Connect authentication to update it securely.",
      );
      e.currentTarget.reset();
      return;
    }
    const formValues: Record<string, string> = {};
    for (const [key, value] of data.entries()) {
      if (typeof value === "string") formValues[key] = value;
    }
    saveStored("profile-data", JSON.stringify({ ...profileFields, ...formValues }));
    if (photo) {
      try {
        saveStored("profile-photo", photo);
      } catch {
        notify("Photo is too large to save. Please choose a smaller image.");
        return;
      }
    }
    if (data.get("Your Name"))
      saveStored("learner-name", String(data.get("Your Name")));
    saveStored("profile-bio", bio);
    saveStored("preferences", JSON.stringify(toggles));
    notify("Your changes have been saved.");
  }
  return (
    <div className="settings-layout">
      <Panel className="settings-nav">
            <h2>{t('title')}</h2>
            <p>{t('subtitle')}</p>
        {settings.map((s, i) => {
          const I = [User, CreditCard, Lock, Bell, BarChart3, Sparkles][i];
          return (
            <button
              className={tab === s[0] ? "selected" : ""}
              onClick={() => setTab(s[0])}
              key={s[0]}
            >
              <I />
              <span>
                <strong>{t(s[1])}</strong>
                <small>{t(s[2])}</small>
              </span>
            </button>
          );
        })}
      </Panel>
      <form
        key={`${tab}-${formVersion}`}
        className="panel settings-form"
        onSubmit={save}
      >
        <div className="settings-form-heading">
          <div>
            <h1>{t(tabTitle)}</h1>
            <p>
              {tab === "Profile" ? t("profileSubtitle") : t("manageSelected", { item: t(tabTitle).toLowerCase() })}
            </p>
          </div>
          {tab === "Profile" && (
            <div className="change-photo">
              {photo ? (
                <Image
                  className="avatar"
                  src={photo}
                  alt="Your profile"
                  width={100}
                  height={100}
                  unoptimized
                />
              ) : (
                <Avatar />
              )}
              <div>
                <label className="btn outline">
                  <Camera size={20} />
                  {t("changePhoto")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 5 * 1024 * 1024) {
                        notify("Please choose an image smaller than 5 MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setPhotoDraft(String(reader.result));
                        notify("Photo selected. Save Changes to keep it.");
                      };
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
                <small>JPG, PNG or GIF. Max 5MB.</small>
              </div>
            </div>
          )}
        </div>
        {tab === "Profile" ? (
          <>
            <div className="form-grid">
              <SettingsField
                label={t("fullName")}
                name="Your Name"
                icon={User}
                value={learnerName}
                required
              />
              <SettingsField
                label={t("email")}
                name="Your Email"
                icon={Mail}
                type="email"
                value="ahmed.salah@university.edu"
                required
              />
              <SettingsField label={t("age")} name="Age" icon={CalendarDays} type="number" value="24" />
              <SettingsField
                label={t("gender")}
                name="Gender"
                icon={User}
                value="Male"
                options={["Male", "Female", "Prefer not to say"]}
              />
              <SettingsField
                label={t("university")}
                name="University"
                icon={Building2}
                value="Cairo University"
                options={[
                  "Cairo University",
                  "Ain Shams University",
                  "Alexandria University",
                  "Other",
                ]}
              />
              <SettingsField
                label={t("faculty")}
                name="Faculty"
                icon={GraduationCap}
                value="Faculty of Engineering"
                options={[
                  "Faculty of Engineering",
                  "Computer Science",
                  "Business",
                  "Other",
                ]}
              />
              <SettingsField
                label={t("timezone")}
                name="Timezone"
                icon={Globe}
                value="(GMT+2) Cairo, Egypt"
                options={[
                  "(GMT+2) Cairo, Egypt",
                  "(GMT+0) London",
                  "(GMT+5) Karachi",
                ]}
              />
              <Field
                label={t('language')}
                name="Language"
                icon={Languages}
                value={locale === 'en' ? 'English (US)' : 'Arabic'}
                options={['English (US)', 'Arabic']}
                onChange={(event) => changeLocale(event.currentTarget.value === 'Arabic' ? 'ar' : 'en')}
              />
            </div>
            <div className="about-you">
              <Pencil />
              <div>
                <h3>{t("aboutYou")}</h3>
                <p>
                  {t("aboutPrompt")}
                </p>
                <textarea
                  aria-label="About you"
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBioDraft(e.target.value)}
                />
                <small>{bio.length}/500</small>
              </div>
            </div>
          </>
        ) : tab === "Security" ? (
          <div className="form-grid">
            <SettingsField
              label={t("currentPasswordLabel")}
              name="Current Password"
              type="password"
              icon={Lock}
              required
            />
            <SettingsField label={t("newPasswordLabel")} name="New Password" type="password" icon={Lock} required />
            <SettingsField
              label={t("confirmNewPassword")}
              name="Confirm New Password"
              type="password"
              icon={Lock}
              required
            />
          </div>
        ) : tab === "Account" ? (
          <div className="form-grid">
            <SettingsField
              label={t("accountEmail")}
              name="Account Email"
              type="email"
              icon={Mail}
              value="ahmed.salah@university.edu"
            />
            <SettingsField
              label={t("accountType")}
              name="Account Type"
              value="Professional"
              options={["Student", "Professional", "Company enrolled"]}
            />
          </div>
        ) : (
          <div className="preference-options">
            {(tab === "Notifications"
              ? [
                  "Email notifications",
                  "Course reminders",
                  "Assignment deadlines",
                  "Community updates",
                ]
              : tab === "Learning Preferences"
                ? [
                    "Daily learning reminders",
                    "Show course recommendations",
                    "Autoplay next lesson",
                  ]
                : [
                    "Use current course context",
                    "Personalized recommendations",
                    "Save conversation history",
                  ]
            ).map((t) => (
              <label key={t}>
                <span>
                  <strong>{t}</strong>
                  <p>Enable {t.toLowerCase()} for your learning experience.</p>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label={t}
                  aria-checked={toggles[t] !== false}
                  className={"switch " + (toggles[t] !== false ? "on" : "")}
                  onClick={() =>
                    setToggleDraft({
                      ...toggles,
                      [t]: toggles[t] === false,
                    })
                  }
                />
              </label>
            ))}
          </div>
        )}
        <div className="settings-buttons">
          <Button
            outline
            onClick={() => {
              setBioDraft(null);
              setPhotoDraft(null);
              setToggleDraft(null);
              setFormVersion((v) => v + 1);
              notify("Unsaved changes discarded.");
            }}
          >
            {common("cancel")}
          </Button>
          <Button type="submit">{common("save")}</Button>
        </div>
      </form>
    </div>
  );
}
