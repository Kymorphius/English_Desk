#import <Cocoa/Cocoa.h>
#include <node_api.h>
#include <vector>

@interface EDMenuPanel : NSObject <NSPopoverDelegate>
@property(strong) NSStatusItem *item;
@property(strong) NSPopover *popover;
@property(strong) NSView *content;
@property(strong) NSWindow *owner;
@property(strong) NSVisualEffectView *glass;
@property(strong) id keyMonitor;
@property(strong) id outsideMonitor;
@property NSTimeInterval shownAt;
@property NSInteger placementWaits;
@property BOOL hasShown;
@property NSRect lastItemFrame;
@property(strong) NSWindow *anchor;
@property(copy) NSString *placement;
@property BOOL pinned;
@property napi_env env;
@property napi_ref callback;
- (void)show;
- (void)notify:(NSString *)event;
@end
@implementation EDMenuPanel
- (void)notify:(NSString *)event {
  napi_handle_scope scope; napi_open_handle_scope(self.env,&scope);
  napi_value cb,global,arg,result; napi_get_reference_value(self.env,self.callback,&cb);
  napi_get_global(self.env,&global); napi_create_string_utf8(self.env,event.UTF8String,NAPI_AUTO_LENGTH,&arg);
  napi_call_function(self.env,global,cb,1,&arg,&result); napi_close_handle_scope(self.env,scope);
}
// The popover points at the status item when it is on screen. When it is hidden (behind the notch, or pushed out by a long menu bar)
// or the user prefers the left side, it points at an invisible anchor instead.
- (NSView *)anchorFor:(NSStatusBarButton *)b screen:(NSScreen *)screen {
  NSRect item=b.window.frame;BOOL visible=NSMinX(item)>-1000&&b.window.screen!=nil;
  if(visible)self.lastItemFrame=item;
  if(visible&&![self.placement isEqualToString:@"left"])return b;
  CGFloat barTop=NSMaxY(screen.frame),barHeight=MAX(NSMaxY(screen.frame)-NSMaxY(screen.visibleFrame),24);
  NSRect target=[self.placement isEqualToString:@"left"]?NSMakeRect(NSMinX(screen.frame)+220,barTop-barHeight,22,barHeight)
    :!NSIsEmptyRect(self.lastItemFrame)?self.lastItemFrame:NSMakeRect(NSMaxX(screen.frame)-240,barTop-barHeight,22,barHeight);
  if(!self.anchor){self.anchor=[[NSWindow alloc] initWithContentRect:target styleMask:NSWindowStyleMaskBorderless backing:NSBackingStoreBuffered defer:NO];self.anchor.opaque=NO;self.anchor.backgroundColor=NSColor.clearColor;self.anchor.ignoresMouseEvents=YES;self.anchor.level=NSStatusWindowLevel;self.anchor.releasedWhenClosed=NO;self.anchor.hasShadow=NO;}
  [self.anchor setFrame:target display:NO];[self.anchor orderFrontRegardless];
  return self.anchor.contentView;
}
- (void)show {
  NSStatusBarButton *b=self.item.button;
  // Right after launch the status item has not been placed yet (it sits far off-screen); wait up to 1s for it, once.
  if(!self.hasShown&&NSMinX(b.window.frame)<-1000&&self.placementWaits<10){self.placementWaits++;dispatch_after(dispatch_time(DISPATCH_TIME_NOW,(int64_t)(0.1*NSEC_PER_SEC)),dispatch_get_main_queue(),^{[self show];});return;}
  self.placementWaits=0;
  NSScreen *screen=b.window.screen?:NSScreen.mainScreen; // the status item can be hidden behind the notch, leaving no screen
  NSView *anchor=[self anchorFor:b screen:screen];
  NSSize size=NSMakeSize(400,MIN(720,screen.visibleFrame.size.height-30));
  self.popover.contentSize=size;
  // Give the web content its final size before the popover appears; resizing it afterwards made the page reflow and visibly drop.
  [self.glass setFrameSize:size];self.content.frame=self.glass.bounds; // size only: the popover owns where its content view sits
  // activateIgnoringOtherApps is deprecated and can be ignored since macOS 14, leaving the popover behind other apps.
  if(@available(macOS 14.0,*))[NSApp activate];else [NSApp activateIgnoringOtherApps:YES];
  [self.popover showRelativeToRect:anchor.bounds ofView:anchor preferredEdge:NSMinYEdge];self.hasShown=YES;
  // macOS 26 first places the popover a few points into the menu bar and moves it down about 0.1s later; put it at the final place now so nothing moves.
  NSWindow *pw=self.popover.contentViewController.view.window;CGFloat overlap=NSMaxY(pw.frame)-NSMinY(anchor.window.frame);
  if(overlap>0&&overlap<12){NSRect f=pw.frame;f.origin.y-=overlap;[pw setFrame:f display:NO];}
  NSWindow *w=self.popover.contentViewController.view.window;
  w.level=NSFloatingWindowLevel;[w orderFrontRegardless]; // visible even if activation has not happened yet
  [w makeKeyWindow]; [w makeFirstResponder:self.content];
  [self notify:@"show"];
}
- (void)clicked:(id)sender {
  if(NSApp.currentEvent.type==NSEventTypeRightMouseUp){
    NSMenu *menu=[[NSMenu alloc] init];
    NSMenuItem *open=[menu addItemWithTitle:@"打开 English Desk" action:@selector(open:) keyEquivalent:@""];open.target=self;
    NSMenuItem *pin=[menu addItemWithTitle:@"面板置顶" action:@selector(pin:) keyEquivalent:@""];pin.target=self;pin.state=self.pinned?NSControlStateValueOn:NSControlStateValueOff;
    [menu addItem:NSMenuItem.separatorItem];
    NSMenuItem *quit=[menu addItemWithTitle:@"退出 English Desk" action:@selector(quit:) keyEquivalent:@""];quit.target=self;
    self.item.menu=menu;[self.item.button performClick:nil];self.item.menu=nil;return;
  }
  if(self.popover.shown)[self.popover performClose:nil];else [self show];
}
- (void)open:(id)sender {[self show];}
- (void)pin:(id)sender {self.pinned=!self.pinned;self.popover.behavior=NSPopoverBehaviorApplicationDefined;[self notify:@"pin"];}
- (void)quit:(id)sender {[self notify:@"quit"];}
- (void)popoverDidShow:(NSNotification *)notification {
  self.shownAt=NSProcessInfo.processInfo.systemUptime;
  // The popover lays out its content after the opening animation.
  [self.glass layoutSubtreeIfNeeded];
  if(!NSEqualRects(self.content.frame,self.glass.bounds))self.content.frame=self.glass.bounds;
  [self.popover.contentViewController.view.window makeFirstResponder:self.content];
  [self notify:@"show"];
}
- (void)popoverDidClose:(NSNotification *)notification {[self.anchor orderOut:nil];[self notify:@"hide"];}
@end
static EDMenuPanel *panel;
static napi_value undefined(napi_env env){napi_value v;napi_get_undefined(env,&v);return v;}
static napi_value Create(napi_env env,napi_callback_info info){
  size_t argc=3;napi_value args[3];napi_get_cb_info(env,info,&argc,args,NULL,NULL);
  void *bytes=NULL;size_t size=0;bool pinned=false;
  if(argc!=3||napi_get_buffer_info(env,args[0],&bytes,&size)!=napi_ok||size!=sizeof(void *)){napi_throw_error(env,NULL,"Invalid native view handle");return NULL;}
  napi_get_value_bool(env,args[1],&pinned);
  NSView *handle=(__bridge NSView *)(*(void **)bytes);
  panel=[EDMenuPanel new];panel.env=env;napi_ref callback;napi_create_reference(env,args[2],1,&callback);panel.callback=callback;
  panel.owner=handle.window;panel.content=panel.owner.contentView;panel.pinned=pinned;
  [panel.owner orderOut:nil];
  panel.owner.contentView=[[NSView alloc] initWithFrame:NSMakeRect(0,0,400,720)];
  panel.glass=[[NSVisualEffectView alloc] initWithFrame:NSMakeRect(0,0,400,720)];
  panel.glass.material=NSVisualEffectMaterialPopover;panel.glass.blendingMode=NSVisualEffectBlendingModeBehindWindow;panel.glass.state=NSVisualEffectStateActive;
  panel.content.frame=panel.glass.bounds;panel.content.translatesAutoresizingMaskIntoConstraints=YES;panel.content.autoresizingMask=NSViewWidthSizable|NSViewHeightSizable;[panel.glass addSubview:panel.content];
  NSViewController *vc=[NSViewController new];vc.view=panel.glass;
  panel.popover=[NSPopover new];panel.popover.contentViewController=vc;panel.popover.delegate=panel;
  panel.popover.contentSize=NSMakeSize(400,720);panel.popover.animates=NO; // appear at once, like the system's menu bar extras, instead of dropping in
  panel.popover.behavior=NSPopoverBehaviorApplicationDefined;
  panel.item=[NSStatusBar.systemStatusBar statusItemWithLength:NSSquareStatusItemLength];
  panel.item.autosaveName=@"EnglishDeskStudioStatus";
  NSStatusBarButton *button=panel.item.button;button.image=[NSImage imageWithSystemSymbolName:@"character.book.closed" accessibilityDescription:@"English Desk Studio"];[button.image setTemplate:YES];
  button.toolTip=@"English Desk Studio";button.target=panel;button.action=@selector(clicked:);[button sendActionOn:NSEventMaskLeftMouseUp|NSEventMaskRightMouseUp];
  // Closing is ours, not AppKit's: transient popovers also close on clicks that the status item then swallows as a drag, leaving the icon unresponsive.
  panel.outsideMonitor=[NSEvent addGlobalMonitorForEventsMatchingMask:NSEventMaskLeftMouseDown|NSEventMaskRightMouseDown|NSEventMaskOtherMouseDown handler:^(NSEvent *event){if(!panel.pinned&&panel.popover.shown)[panel.popover performClose:nil];}];
  [NSNotificationCenter.defaultCenter addObserverForName:NSApplicationDidResignActiveNotification object:nil queue:nil usingBlock:^(NSNotification *n){if(!panel.pinned&&panel.popover.shown&&NSProcessInfo.processInfo.systemUptime-panel.shownAt>0.3)[panel.popover performClose:nil];}];
  panel.keyMonitor=[NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskKeyDown handler:^NSEvent *(NSEvent *event){if(event.keyCode==53&&panel.popover.shown){[panel.popover performClose:nil];return nil;}return event;}];
  return undefined(env);
}
static napi_value Show(napi_env env,napi_callback_info info){[panel show];return undefined(env);}
static napi_value Hide(napi_env env,napi_callback_info info){[panel.popover performClose:nil];return undefined(env);}
static napi_value SetPinned(napi_env env,napi_callback_info info){size_t argc=1;napi_value arg;napi_get_cb_info(env,info,&argc,&arg,NULL,NULL);bool value=false;napi_get_value_bool(env,arg,&value);panel.pinned=value;panel.popover.behavior=NSPopoverBehaviorApplicationDefined;return undefined(env);}
static napi_value Click(napi_env env,napi_callback_info info){[panel.item.button performClick:nil];return undefined(env);}
static NSString *StringArgument(napi_env env,napi_callback_info info){size_t argc=1;napi_value arg;napi_get_cb_info(env,info,&argc,&arg,NULL,NULL);size_t length=0;napi_get_value_string_utf8(env,arg,NULL,0,&length);std::vector<char> bytes(length+1);napi_get_value_string_utf8(env,arg,bytes.data(),bytes.size(),&length);return [NSString stringWithUTF8String:bytes.data()];}
static napi_value SelectFile(napi_env env,napi_callback_info info){
 NSString *kind=StringArgument(env,info);[NSApp activateIgnoringOtherApps:YES];
 NSSavePanel *picker;
 if([kind isEqualToString:@"recording"]){picker=[NSSavePanel savePanel];picker.nameFieldStringValue=@"speaking.webm";picker.allowedFileTypes=@[@"webm"];}
 else{NSOpenPanel *open=[NSOpenPanel openPanel];open.canChooseDirectories=NO;open.allowsMultipleSelection=NO;open.allowedFileTypes=[kind isEqualToString:@"template"]?@[@"txt",@"md"]:@[@"json",@"txt",@"md",@"csv",@"tsv"];picker=open;}
 picker.level=NSModalPanelWindowLevel;NSModalResponse result=[picker runModal];
 napi_value out;if(result==NSModalResponseOK)napi_create_string_utf8(env,picker.URL.path.UTF8String,NAPI_AUTO_LENGTH,&out);else napi_get_null(env,&out);return out;
}
static napi_value Confirm(napi_env env,napi_callback_info info){
 NSAlert *alert=[NSAlert new];alert.messageText=StringArgument(env,info);[alert addButtonWithTitle:@"确定"];[alert addButtonWithTitle:@"取消"];
 [NSApp activateIgnoringOtherApps:YES];alert.window.level=NSModalPanelWindowLevel;napi_value out;napi_get_boolean(env,[alert runModal]==NSAlertFirstButtonReturn,&out);return out;
}
static napi_value Inspect(napi_env env,napi_callback_info info){
  NSRect b=panel.item.button.window.frame;NSRect p=panel.popover.contentViewController.view.window.frame;
  NSDictionary *state=@{@"kind":@"NSPopover",@"shown":@(panel.popover.shown),@"pinned":@(panel.pinned),@"templateIcon":@([panel.item.button.image isTemplate]),@"material":@(panel.glass.material),@"behindWindow":@(panel.glass.blendingMode==NSVisualEffectBlendingModeBehindWindow),@"glassWidth":@(panel.glass.frame.size.width),@"contentClass":NSStringFromClass(panel.content.class),@"subviews":panel.content.subviews.description,@"width":@(panel.content.frame.size.width),@"height":@(panel.content.frame.size.height),@"statusX":@(b.origin.x),@"statusY":@(b.origin.y),@"statusVisible":@(panel.item.button.window.occlusionState&NSWindowOcclusionStateVisible),@"popoverX":@(p.origin.x),@"popoverY":@(p.origin.y),@"popoverHeight":@(p.size.height)};
  NSData *json=[NSJSONSerialization dataWithJSONObject:state options:0 error:nil];napi_value out;napi_create_string_utf8(env,(const char *)json.bytes,json.length,&out);return out;
}
static napi_value Dispose(napi_env env,napi_callback_info info){
  if(panel){panel.popover.delegate=nil;[panel.popover close];[NSEvent removeMonitor:panel.keyMonitor];if(panel.outsideMonitor)[NSEvent removeMonitor:panel.outsideMonitor];[panel.anchor close];[NSStatusBar.systemStatusBar removeStatusItem:panel.item];[panel.content removeFromSuperview];panel.owner.contentView=panel.content;napi_delete_reference(env,panel.callback);panel=nil;}return undefined(env);
}
static napi_value SetPlacement(napi_env env,napi_callback_info info){NSString *value=StringArgument(env,info);panel.placement=[value isEqualToString:@"left"]?@"left":@"icon";return undefined(env);}
static napi_value Init(napi_env env,napi_value exports){
  napi_property_descriptor methods[]={{"create",0,Create,0,0,0,napi_default,0},{"show",0,Show,0,0,0,napi_default,0},{"hide",0,Hide,0,0,0,napi_default,0},{"inspect",0,Inspect,0,0,0,napi_default,0},{"dispose",0,Dispose,0,0,0,napi_default,0}};
  napi_define_properties(env,exports,sizeof(methods)/sizeof(methods[0]),methods);
  napi_property_descriptor controls[]={{"setPinned",0,SetPinned,0,0,0,napi_default,0},{"clickStatus",0,Click,0,0,0,napi_default,0}};
  napi_define_properties(env,exports,2,controls);
  napi_property_descriptor dialogs[]={{"selectFile",0,SelectFile,0,0,0,napi_default,0},{"confirm",0,Confirm,0,0,0,napi_default,0}};napi_define_properties(env,exports,2,dialogs);napi_property_descriptor placement[]={{"setPlacement",0,SetPlacement,0,0,0,napi_default,0}};napi_define_properties(env,exports,1,placement);return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME,Init)
