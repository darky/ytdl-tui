(ns main
  (:require
   ["ink$default" :refer [Box render]]
   ["ink-big-text$default" :as Bigtext]
   ["ink-form$default" :refer [Form]]
   ["ytdl-core$default" :as ytdl]
   ["fs" :as fs]
   [reagent.core :as r]))


(defn- on-download [obj]
  (.pipe
   (ytdl (.-url obj))
   (fs/createWriteStream (.-path obj))))


(defn- Main []
  [:> Box {:flex-direction "column"}
   [:> Box
    [:> Bigtext {:text "YOUTUBE DOWNLOAD"}]]
   [:> Box
    [:> Form
     {:on-submit on-download
      :form
      {:title "Please setup form for downloading video from Youtube"
       :sections
       [{:fields
         [{:type "string"
           :name "url"
           :label "Youtube URL"
           :regex #"^https://.*$"}
          {:type "string"
           :name "path"
           :label "File location"
           :initialValue (str (.cwd js/process) "/video.mp4")}]}]}}]]])


(render (r/as-element [Main]))
