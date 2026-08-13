export type CurrentUserProfile = {
  id: number
  email: string
  nickname: string
  avatar: string | null
}

export type UserLoginParams = {
  email: string
  password: string
  rememberMe: boolean
}

export type UserRestoreParams = Pick<UserLoginParams, 'email' | 'password'>

export type UserLoginResponse = CurrentUserProfile & {
  token?: string
}

export type UserCaptcha = {
  captchaId: string
  imageBase64: string
}

export type EmailCodeSendParams = {
  email: string
  captchaId: string
  captchaCode: string
}

export type UserRegistrationParams = {
  email: string
  emailCode: string
  password: string
  nickname: string
}

export type UserPasswordResetParams = {
  email: string
  emailCode: string
  newPassword: string
}
