import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

import { FrontSceneBanner } from '@/components/front/layout/FrontSceneBanner'
import { FrontSiteBackground } from '@/components/front/layout/FrontSiteBackground'
import { useFrontMotionPreference } from '@/hooks/front/motionPreference'
import { useUserProfileQuery } from '@/queries/userProfile'

import { ProfileEditor } from './ProfileEditor'
import { ProfileSecurity } from './ProfileSecurity'
import './profile.css'

gsap.registerPlugin(useGSAP)

export const UserProfileView = () => {
  const profile = useUserProfileQuery()
  const rootRef = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useFrontMotionPreference()

  useGSAP(
    () => {
      if (reducedMotion || !profile.data) return
      gsap.fromTo(
        '[data-profile-enter]',
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          stagger: 0.04,
          overwrite: 'auto',
        },
      )
    },
    {
      dependencies: [profile.data, reducedMotion],
      revertOnUpdate: true,
      scope: rootRef,
    },
  )

  if (!profile.data) {
    return (
      <p className="profile-page__status" role="status">
        资料加载中
      </p>
    )
  }

  return (
    <div className="profile-page" ref={rootRef}>
      <FrontSceneBanner
        className="profile-hero"
        media={<FrontSiteBackground />}
        stationLabel="个人资料页头图"
      >
        <div className="profile-hero__copy front-container">
          <h1>个人资料</h1>
        </div>
      </FrontSceneBanner>
      <div className="profile-page__content front-container">
        <div data-profile-enter>
          <ProfileEditor profile={profile.data} />
        </div>
        <div data-profile-enter>
          <ProfileSecurity profile={profile.data} />
        </div>
      </div>
    </div>
  )
}
