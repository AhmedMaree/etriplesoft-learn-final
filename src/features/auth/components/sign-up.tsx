"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { BookOpen, Sparkles, CalendarDays, Award, ArrowRight, GraduationCap, BarChart3, FileText, User, Mail, Lock, Building2 } from 'lucide-react';
import { Button, IconBox } from '@/components/ui/primitives';
import { Field } from '@/components/ui/field';
import { saveStored } from '@/lib/browser/demo-storage';
import { useDemoToast } from '@/lib/browser/demo-toast';
import { useDemoNavigation } from '@/hooks/use-demo-navigation';
import { ASSET_BASE } from '@/lib/assets';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';

export function SignUp() {
  const t = useTranslations('auth');
  const navigate = useDemoNavigation();
  const notify = useDemoToast();

  const [role, setRole] = useState("Professional");
  const [login, setLogin] = useState(false);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!login && data.get("Password") !== data.get("Confirm Password")) {
      notify(t("passwordMismatchLong"));
      return;
    }
    saveStored(
      "learner-name",
      String(data.get("Your Name") || "Ahmed Salah"),
    );
    notify(login ? t("welcomeMessage") : t("demoReady"));
    navigate("overview");
  }
  return (
    <div className="signup-page">
      <header>
        <Link href="/">
          <Image
            src={ASSET_BASE + "logo-display.svg"}
            alt="ETripleSoft Learn"
            width={871}
            height={278}
          />
        </Link>
        <div className="signup-header-actions">
          <LocaleSwitcher className="signup-locale" />
          <span>
            {login ? t("newTo") : t("alreadyAccount")}
          </span>
          <Button outline onClick={() => setLogin(!login)}>
            {login ? t("signUpAction") : t("login")} <ArrowRight size={19} />
          </Button>
        </div>
      </header>
      <div className="signup-layout">
        <section className="signup-intro">
            <Image
              className="signup-photo"
              src={ASSET_BASE + "learner-hero.png"}
            alt={t("heroAlt")}
              width={1536}
              height={1024}
              sizes="(max-width: 900px) 100vw, 50vw"
              loading="eager"
          />
          <div className="signup-copy">
            <div className="eyebrow">{t("tagline")}</div>
            <h1>
              {t("heroHeadingStart")}
              <br />
              <span>{t("heroHeadingEnd")}</span>
            </h1>
            <p>
              {t("heroCopyStart")}
              <br />
              {t("heroCopyEnd")}
            </p>
          </div>
          <div className="signup-benefits">
            {[BookOpen, BarChart3, FileText, Award, Sparkles].map((I, i) => (
              <div key={i}>
                <IconBox icon={I} color={i % 2 ? "green" : "blue"} />
                <div>
                  <h3>
                    {
                      [
                        t("benefitEnroll"),
                        t("benefitProgress"),
                        t("benefitQuizzes"),
                        t("benefitCertificates"),
                        t("benefitAi"),
                      ][i]
                    }
                  </h3>
                  <p>
                    {
                      [
                        t("benefitEnrollCopy"),
                        t("benefitProgressCopy"),
                        t("benefitQuizzesCopy"),
                        t("benefitCertificatesCopy"),
                        t("benefitAiCopy"),
                      ][i]
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="handwriting">
            {t("handwritingStart")}
            <br />{t("handwritingEnd")}
          </div>
        </section>
        <form
          className={"signup-form panel" + (login ? " login-mode" : "")}
          onSubmit={submit}
        >
          <h1>{login ? t("welcomeAgain") : t("signUp")}</h1>
          <p>
            {login
              ? t("loginCopy")
              : t("createFuture")}
          </p>
          <div className="form-grid">
            <Field
              label={t("email")}
              name="Your Email"
              icon={Mail}
              type="email"
              placeholder={t("emailExample")}
              required
            />
            {!login && (
              <Field
                label={t("yourName")}
                name="Your Name"
                icon={User}
                placeholder={t("yourNameExample")}
                required
              />
            )}
            <Field
              label={t("password")}
              name="Password"
              icon={Lock}
              type="password"
              placeholder={login ? t("enterPassword") : t("createPassword")}
              required
            />
            {!login && (
              <>
                <Field
                  label={t("confirmPassword")}
                  name="Confirm Password"
                  icon={Lock}
                  type="password"
                  placeholder={t("confirmPasswordPlaceholder")}
                  required
                />
                <Field
                  label={t("age")}
                  icon={CalendarDays}
                  type="number"
                  placeholder={t("ageExample")}
                  required
                />
                <Field
                  label={t("gender")}
                  name="Gender"
                  icon={User}
                  options={[t("male"), t("female"), t("preferNotToSay")]}
                  required
                />
                <Field
                  label={t("university")}
                  icon={Building2}
                  placeholder={t("selectUniversity")}
                  options={[
                    "Cairo University",
                    "Ain Shams University",
                    "Alexandria University",
                    t("other"),
                    t("notApplicable"),
                  ]}
                />
                <Field
                  label={t("faculty")}
                  icon={GraduationCap}
                  placeholder={t("selectFaculty")}
                  options={[
                    "Faculty of Engineering",
                    "Computer Science",
                    "Business",
                    t("other"),
                    t("notApplicable"),
                  ]}
                />
              </>
            )}
          </div>
          {!login && (
            <fieldset>
              <legend>{t("yourRole")}</legend>
              {["Student", "Professional", "My company enrolled me"].map(
                (r, i) => (
                  <label
                    className={"role-option " + (role === r ? "chosen" : "")}
                    key={r}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={role === r}
                      onChange={() => setRole(r)}
                    />
                    <span>
                      <b>{[t("studentRole"), t("professionalRole"), t("companyRole")][i]}</b> —{" "}
                      {
                        [
                          t("studentRoleCopy"),
                          t("professionalRoleCopy"),
                          t("companyRoleCopy"),
                        ][i]
                      }
                    </span>
                  </label>
                ),
              )}
            </fieldset>
          )}
          {login && (
            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" name="remember" defaultChecked />
                <span>{t("rememberMe")}</span>
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  notify(t("passwordRecoveryDemo"))
                }
              >
                {t("forgotPassword")}
              </button>
            </div>
          )}
          <Button type="submit" className="create-account">
            {login ? t("login") : t("createAccount")} <ArrowRight size={21} />
          </Button>
          <p className="login-link">
            {login ? t("noAccount") : t("alreadyAccount")}{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => setLogin(!login)}
            >
              {login ? t("signUpAction") : t("login")}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
