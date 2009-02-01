/**
 * (C) Copyright 2007-2008 John J. Foerch
 * (C) Copyright 2007-2008 Jeremy Maitin-Shepard
 *
 * Use, modification, and distribution are subject to the terms specified in the
 * COPYING file.
**/

require("bindings/default/content-buffer/normal.js");
require("element.js");

define_key(content_buffer_normal_keymap, "i", "browser-object-images");
define_key(content_buffer_normal_keymap, "n", "browser-object-links");
define_key(content_buffer_normal_keymap, "m", "browser-object-frames");
define_key(content_buffer_normal_keymap, "e", "browser-object-media");


define_key(content_buffer_normal_keymap, "* e", "browser-object-media");
define_key(content_buffer_normal_keymap, "* i", "browser-object-images");
define_key(content_buffer_normal_keymap, "* n", "browser-object-links");
define_key(content_buffer_normal_keymap, "* m", "browser-object-frames");
define_key(content_buffer_normal_keymap, "* M", "browser-object-mathml");
define_key(content_buffer_normal_keymap, "* u", "browser-object-url");
define_key(content_buffer_normal_keymap, "* a", "browser-object-alt");
define_key(content_buffer_normal_keymap, "* t", "browser-object-title");
define_key(content_buffer_normal_keymap, "* T", "browser-object-title-or-alt");


define_key(content_buffer_normal_keymap, "[",
           "browser-object-relationship-previous",
           $repeat = "follow");
define_key(content_buffer_normal_keymap, "]",
           "browser-object-relationship-next",
           $repeat = "follow");
define_key(content_buffer_normal_keymap, "^",
           "browser-object-up-url",
           $repeat = "follow");


define_key(content_buffer_normal_keymap, "f", "follow");
define_key(content_buffer_normal_keymap, ";", "focus");
define_key(content_buffer_normal_keymap, "t", "follow-top");
define_key(content_buffer_normal_keymap, "s", "save");
define_key(content_buffer_normal_keymap, "c", "copy");
define_key(content_buffer_normal_keymap, "\\", "view-source");
define_key(content_buffer_normal_keymap, "x", "shell-command-on-file");
define_key(content_buffer_normal_keymap, "X", "shell-command-on-url");
define_key(content_buffer_normal_keymap, "b", "bookmark");
define_key(content_buffer_normal_keymap, "v", "view-as-mime-type");


// Scrolling
define_key(content_buffer_normal_keymap, "<",
           "browser-object-previous-heading",
           $repeat = "scroll");
define_key(content_buffer_normal_keymap, ">",
           "browser-object-next-heading",
           $repeat = "scroll");

