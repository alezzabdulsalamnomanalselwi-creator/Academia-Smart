import React from 'react';
export default class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error,info){console.error('Academia Smart UI error',error,info)}
  render(){if(this.state.error)return <div dir="rtl" className="min-h-screen flex items-center justify-center bg-secondary-50 p-6"><div className="bg-white border rounded-2xl p-8 max-w-xl text-center"><div className="text-5xl mb-4">⚠️</div><h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1><p className="text-secondary-600 my-3">لم نفقد بياناتك. حدّث الصفحة، وإذا تكرر الخطأ راجع سجل التشغيل.</p><button onClick={()=>window.location.reload()} className="bg-primary-600 text-white px-5 py-3 rounded-xl">إعادة تحميل الصفحة</button></div></div>;return this.props.children}
}
