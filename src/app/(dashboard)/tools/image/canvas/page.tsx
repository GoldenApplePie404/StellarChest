// 旧地址跳转到全屏新版画板
import { redirect } from 'next/navigation';

export default function LegacyCanvasRedirectPage(): React.JSX.Element {
  redirect('/canvas-studio');
  return <></>;
}
