import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { BookOpen, Users, CalendarDays, ChevronRight, ArrowRight, BarChart3, Clock, ListChecks, Star, Trophy, Check, Globe, Pencil, Flame } from 'lucide-react';
import { Panel, Title, IconBox, Progress } from '@/components/ui/primitives';
import { Avatar } from '@/components/shared/profile-avatar';
import { ASSET_BASE } from '@/lib/assets';
import { courses, featuredCourse } from '@/features/courses/data/demo-courses';
import { CertificateActions } from '@/features/certificates/components/certificate-actions';
import { AchievementsTitle } from '@/features/certificates/components/achievements-title';
import { CertificateScrollLink } from '@/features/certificates/components/certificate-scroll-link';
import { useTranslations } from 'next-intl';

export function Certificates() {
  const t = useTranslations("certificates");
  return (
    <>
      <div className="certificate-profile">
        <Panel className="profile-summary">
          <Avatar large />
          <div>
            <h2>
              Ahmed Salah{" "}
              <Link
                aria-label="Edit profile"
                className="icon-button"
                href="/settings"
              >
                <Pencil size={16} />
              </Link>
            </h2>
            <Link href="/courses">Odoo Learner</Link>
            <p>
              Passionate about business technology and
              <br />
              building a career with Odoo.
            </p>
            <small>
              <Globe size={16} />
              Karachi, Pakistan　 <CalendarDays size={16} />
              Joined Jan 2024
            </small>
          </div>
          <div className="profile-stats">
            {[BookOpen, Clock, BarChart3].map((I, i) => (
              <div key={i}>
                <I />
                <b>{["10", "42h", "4.7"][i]}</b>
                <span>
                  {["Completed Courses", "Learning Time", "Average Rating"][i]}
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="quote">
          <span>“</span>
          <blockquote>
            Continuous learning
            <br />
            today, a better tomorrow.
          </blockquote>
          <p>— Ahmed Salah</p>
        </Panel>
      </div>
      <div className="columns certificate-columns">
        <div className="primary">
          <CertificateScrollLink />
          <Panel className="certificate-panel">
            <div className="certificate" id="certificate">
              <div className="certificate-top">
                <Image
                  src={ASSET_BASE + "logo-display.svg"}
                  alt="ETripleSoft Learn"
                  width={871}
                  height={278}
                />
                <i>Certificate of Completion</i>
              </div>
              <div className="certificate-body">
                <p>This is to certify that</p>
                <h1>Ahmed Salah</h1>
                <p>has successfully completed the</p>
                <h2>{featuredCourse.name}</h2>
                <p>
                  A comprehensive, hands-on course covering Sales, Accounting,
                  CRM,
                  <br />
                  Purchase, Inventory and key business workflows in Odoo.
                </p>
              </div>
              <div className="certificate-seal">
                <span className="ribbon" />
                <Image
                  src={ASSET_BASE + "logo-display.svg"}
                  alt=""
                  width={871}
                  height={278}
                />
              </div>
              <div className="certificate-bottom">
                <div>
                  <small>{t("completedOn")}</small>
                  <b>March 10, 2024</b>
                </div>
                <div className="signature">
                  <i>Usman Khalid</i>
                  <b>Usman Khalid</b>
                  <small>CEO, ETripleSoft</small>
                </div>
                <div className="odoo-word">
                  odoo
                  <small>
                    Open. Source.
                    <br />
                    Greater Possibilities.
                  </small>
                </div>
              </div>
            </div>
            <CertificateActions />
          </Panel>
          <div className="certificate-lower">
            <Panel className="completed-courses">
              <div id="completed">
                <Title href="/courses">{t("completedCourses")}</Title>
              </div>
              {courses.slice(0, 3).map((c, i) => (
                <Link className="completed-row" href="/detail-course" key={c.name}>
                  <Image src={ASSET_BASE + c.image} alt="" width={480} height={280} />
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      <span>Completed</span> Â·{" "}
                      {["Mar 10, 2024", "Feb 12, 2024", "Jan 20, 2024"][i]}
                    </small>
                  </div>
                  <ChevronRight size={18} />
                </Link>
              ))}
            </Panel>
            <Panel>
              <Title>{t("recommendedNext")}</Title>
              <div className="recommended">
                <Image
                  src={ASSET_BASE + "course-2.svg"}
                  alt="Odoo Development"
                  width={480}
                  height={280}
                />
                <div>
                  <h3>Odoo Development</h3>
                  <p>
                    Learn to build custom modules and extend Odoo with Python.
                  </p>
                  <small>
                    <Clock size={15} />
                    8h 30m　
                    <ListChecks size={15} />
                    12 Lessons
                  </small>
                </div>
              </div>
              <Link className="btn outline" href="/detail-course">
                Start Learning <ArrowRight size={18} />
              </Link>
            </Panel>
          </div>
        </div>
        <aside className="right-rail">
          <Panel>
            <AchievementsTitle />
            {[Trophy, Star, Flame, Users].map((I, i) => (
              <div className="achievement" key={i}>
                <IconBox
                  icon={I}
                  color={["orange", "red", "orange", "blue"][i]}
                />
                <div>
                  <strong>
                    {
                      [
                        "Course Completed",
                        "First Certificate",
                        "7-Day Learning Streak",
                        "Community Member",
                      ][i]
                    }
                  </strong>
                  <small>
                    {
                      [
                        featuredCourse.name,
                        "You earned your first certificate!",
                        "Keep the momentum going!",
                        "You joined the ETripleSoft community",
                      ][i]
                    }
                  </small>
                  <small>
                    {
                      [
                        "Mar 10, 2024",
                        "Mar 10, 2024",
                        "Mar 8, 2024",
                        "Jan 15, 2024",
                      ][i]
                    }
                  </small>
                </div>
              </div>
            ))}
          </Panel>
          <Panel>
            <Title>Your Learning Streak</Title>
            <div className="streak-heading">
              <Flame color="#ff671d" size={42} />
              <div>
                <h2>14 Days</h2>
                <p>Great consistency! Keep learning!</p>
              </div>
            </div>
            <div className="streak-days">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <div key={d}>
                  <span className={i < 6 ? "done" : ""}>
                    {i < 6 && <Check size={17} />}
                  </span>
                  <small>{d}</small>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <Title>Learning Progress</Title>
            {[BookOpen, BarChart3, Clock].map((I, i) => (
              <div className="learning-progress" key={i}>
                <IconBox icon={I} color={i ? "blue" : "green"} />
                <div>
                  <strong>{["10 / 10", "8 / 10", "42h"][i]}</strong>
                  <small>
                    {
                      [
                        "Courses Completed",
                        "Learning Paths",
                        "Total Learning Time",
                      ][i]
                    }
                  </small>
                </div>
                <div>
                  <b>{[100, 80, 65][i]}%</b>
                  <Progress value={[100, 80, 65][i]} />
                </div>
              </div>
            ))}
          </Panel>
        </aside>
      </div>
    </>
  );
}
